using System.IO.Compression;
using System.Security.Cryptography;
using System.Text.Json;
using System.Xml;
using System.Xml.Linq;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Validation;

if (args.Length < 2)
{
    Console.Error.WriteLine("Usage: validator <corpus-directory> <report.json> [--require-clean]");
    return 2;
}
var root = Path.GetFullPath(args[0]);
var output = Path.GetFullPath(args[1]);
var files = Directory.GetFiles(root, "*.docx", SearchOption.TopDirectoryOnly).OrderBy(x=>x, StringComparer.Ordinal).ToArray();
if (files.Length == 0) { Console.Error.WriteLine("Empty DOCX corpus"); return 2; }
var results = new List<PackageResult>();
foreach (var file in files)
{
    var issues = new List<Issue>();
    var name = Path.GetFileName(file);
    try
    {
        using (var zip = ZipFile.OpenRead(file))
            ValidateOpc(zip, issues);
        using var document = WordprocessingDocument.Open(file, false);
        if (document.MainDocumentPart?.Document is null)
            issues.Add(new("MAIN_DOCUMENT_MISSING", "OPC", null, null, "Missing main document"));
        var validator = new OpenXmlValidator(FileFormatVersions.Office2021) { MaxNumberOfErrors = 0 };
        foreach (var error in validator.Validate(document))
            issues.Add(new(error.Id ?? "SDK_UNKNOWN", error.ErrorType.ToString(), error.Part?.Uri.ToString(), error.Path?.XPath, error.Description ?? ""));
    }
    catch (Exception ex)
    {
        issues.Add(new("PACKAGE_OPEN_ERROR", "Package", null, null, ex.GetType().Name + ": " + ex.Message));
    }
    results.Add(new(name, Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(file))).ToLowerInvariant(),issues.OrderBy(x=>x.Code,StringComparer.Ordinal).ThenBy(x=>x.Part,StringComparer.Ordinal).ThenBy(x=>x.Path,StringComparer.Ordinal).ThenBy(x=>x.Message,StringComparer.Ordinal).ToArray()));
}
var report = new { version = 1, validator = "DocumentFormat.OpenXml 3.3.0", target = "Office2021", files = results, errors = results.Sum(x=>x.Issues.Length) };
Directory.CreateDirectory(Path.GetDirectoryName(output)!);
File.WriteAllText(output, JsonSerializer.Serialize(report,new JsonSerializerOptions { WriteIndented=true, PropertyNamingPolicy=JsonNamingPolicy.CamelCase })+"\n");
Console.WriteLine($"Validated {results.Count} packages: {report.errors} diagnostics. {output}");
return args.Contains("--require-clean") && report.errors > 0 ? 1 : 0;

static XDocument ReadXml(ZipArchiveEntry entry)
{
    using var stream=entry.Open();
    using var reader=XmlReader.Create(stream,new XmlReaderSettings { DtdProcessing=DtdProcessing.Prohibit, XmlResolver=null, MaxCharactersInDocument=32*1024*1024 });
    return XDocument.Load(reader);
}

static void ValidateOpc(ZipArchive zip, List<Issue> issues)
{
    XNamespace ct="http://schemas.openxmlformats.org/package/2006/content-types";
    XNamespace rel="http://schemas.openxmlformats.org/package/2006/relationships";
    var entries=new Dictionary<string,ZipArchiveEntry>(StringComparer.Ordinal);
    void Add(string code,string? part,string message)=>issues.Add(new(code,"OPC",part,null,message));
    foreach(var e in zip.Entries.Where(e=>!e.FullName.EndsWith('/')))
    {
        if(!entries.TryAdd(e.FullName,e))Add("DUPLICATE_PART",e.FullName,"Duplicate ZIP part name");
        if(e.FullName.StartsWith('/')||e.FullName.Contains('\\')||e.FullName.Split('/').Any(s=>s is "." or ".." or ""))Add("UNSAFE_PART_NAME",e.FullName,"Invalid package part path");
    }
    if(!entries.TryGetValue("[Content_Types].xml",out var types)){Add("CONTENT_TYPES_MISSING",null,"Missing content-types part");return;}
    var typesRoot=ReadXml(types).Root;
    if(typesRoot?.Name!=ct+"Types"){Add("CONTENT_TYPES_ROOT","[Content_Types].xml","Invalid content-types root");return;}
    var defaults=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);
    var overrides=new Dictionary<string,string>(StringComparer.Ordinal);
    foreach(var x in typesRoot.Elements())
    {
        var content=(string?)x.Attribute("ContentType")??"";
        if(x.Name==ct+"Default")
        {
            var ext=(string?)x.Attribute("Extension")??"";
            if(ext.Length==0||content.Length==0||!defaults.TryAdd(ext,content))Add("CONTENT_TYPE_DEFAULT_INVALID","[Content_Types].xml","Empty or duplicate default: "+ext);
        }
        else if(x.Name==ct+"Override")
        {
            var part=(string?)x.Attribute("PartName")??"";
            if(!part.StartsWith('/')||content.Length==0||!overrides.TryAdd(part.TrimStart('/'),content))Add("CONTENT_TYPE_OVERRIDE_INVALID","[Content_Types].xml","Invalid or duplicate override: "+part);
            if(!entries.ContainsKey(part.TrimStart('/')))Add("CONTENT_TYPE_TARGET_MISSING","[Content_Types].xml","Missing override part: "+part);
        }
    }
    foreach(var e in entries.Values)
    {
        if(e.FullName=="[Content_Types].xml")continue;
        var ext=Path.GetExtension(e.FullName).TrimStart('.');
        if(!overrides.ContainsKey(e.FullName)&&!defaults.ContainsKey(ext))Add("CONTENT_TYPE_UNDECLARED",e.FullName,"No content type declared");
        if(!e.FullName.EndsWith(".rels",StringComparison.Ordinal))continue;
        var owner="";
        if(e.FullName!="_rels/.rels")
        {
            var i=e.FullName.LastIndexOf("/_rels/",StringComparison.Ordinal);
            if(i>=0)owner=e.FullName[..(i+1)]+e.FullName[(i+7)..^5];
            else if(e.FullName.StartsWith("_rels/",StringComparison.Ordinal))owner=e.FullName[6..^5];
            else { Add("RELATIONSHIP_PATH_INVALID",e.FullName,"Invalid relationship part path");continue; }
            if(!entries.ContainsKey(owner))Add("RELATIONSHIP_OWNER_MISSING",e.FullName,"Missing owner "+owner);
        }
        var root=ReadXml(e).Root;
        if(root?.Name!=rel+"Relationships"){Add("RELATIONSHIP_ROOT_INVALID",e.FullName,"Invalid relationship root");continue;}
        var ids=new HashSet<string>(StringComparer.Ordinal);
        foreach(var r in root.Elements(rel+"Relationship"))
        {
            var rid=(string?)r.Attribute("Id")??"";
            var target=(string?)r.Attribute("Target")??"";
            var type=(string?)r.Attribute("Type")??"";
            var mode=(string?)r.Attribute("TargetMode")??"Internal";
            if(rid.Length==0||!ids.Add(rid)||type.Length==0||target.Length==0)Add("RELATIONSHIP_INVALID",e.FullName,"Empty or duplicate relationship fields: "+rid);
            if(mode=="External")continue; // Never fetch external targets.
            if(mode!="Internal"){Add("RELATIONSHIP_MODE_INVALID",e.FullName,"Invalid target mode: "+mode);continue;}
            if(!TryResolve(owner,target,out var path)){Add("RELATIONSHIP_TARGET_UNSAFE",e.FullName,"Invalid target: "+target);continue;}
            if(!entries.ContainsKey(path))Add("RELATIONSHIP_TARGET_MISSING",e.FullName,"Missing internal target: "+path);
        }
    }
    if(!entries.ContainsKey("_rels/.rels"))Add("ROOT_RELATIONSHIPS_MISSING",null,"Missing root relationships");
}

static bool TryResolve(string owner,string raw,out string path)
{
    path="";
    var target=raw.Split('#')[0];
    if(target.Length==0||target.Contains('\\')||target.Contains('?')||target.Contains(':')||target.StartsWith("//"))return false;
    var segments=new List<string>();
    if(!target.StartsWith('/')&&owner.Contains('/'))segments.AddRange(owner[..owner.LastIndexOf('/')].Split('/'));
    foreach(var s in target.TrimStart('/').Split('/'))
    {
        var decoded=Uri.UnescapeDataString(s);
        if(decoded.Contains('/')||decoded.Contains('\\')||decoded.Contains('\0'))return false;
        if(decoded==".")continue;
        if(decoded==".."){if(segments.Count==0)return false;segments.RemoveAt(segments.Count-1);}
        else if(decoded.Length==0)return false;
        else segments.Add(decoded);
    }
    path=string.Join('/',segments);
    return path.Length>0;
}

record Issue(string Code,string Category,string? Part,string? Path,string Message);
record PackageResult(string File,string Sha256,Issue[] Issues);
