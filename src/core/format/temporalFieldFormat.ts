/** Strict, bounded Gregorian Word picture subset for field evaluation.
 * The legacy authoring formatter remains compatible with its existing API. */
const tokens = ["am/pm","AM/PM","dddd","MMMM","yyyy","ddd","MMM","dd","MM","yy","HH","hh","mm","ss","d","M","H","h","m","s"];
type Part = {literal:string} | {token:string};

function parsePicture(picture:string):Part[]|undefined {
  if(!picture.length||picture.length>256)return undefined;
  const parts:Part[]=[];
  for(let i=0;i<picture.length;){
    const ch=picture[i]!;
    if(ch==="'"){
      const end=picture.indexOf("'",i+1);
      if(end<0)return undefined;
      parts.push({literal:picture.slice(i+1,end)});i=end+1;continue;
    }
    const token=tokens.find(t=>picture.startsWith(t,i));
    if(token){
      i+=token.length;
      // Do not silently reinterpret an unsupported repeated token.
      if(i<picture.length&&picture[i]===token[0]&&token!=="am/pm"&&token!=="AM/PM")return undefined;
      parts.push({token});continue;
    }
    // Unquoted alphabetic/escape/control tokens may have other Word semantics.
    if(/[\p{L}\\\x00-\x1f]/u.test(ch))return undefined;
    parts.push({literal:ch});i++;
  }
  return parts.some(p=>"token" in p)?parts:undefined;
}
export function supportsTemporalPicture(picture:string):boolean{return !!parsePicture(picture);}

export interface TemporalFormattingOptions {
  locale?: "en-US" | "pt-BR";
  timeZone?: string;
}
export function formatTemporalPicture(epochMs:number,picture:string,options:TemporalFormattingOptions={}):string|undefined{
  const parts=parsePicture(picture);
  if(!parts||!Number.isFinite(epochMs))return undefined;
  const date=new Date(epochMs);
  if(!Number.isFinite(date.getTime()))return undefined;
  try{
    const common={timeZone:options.timeZone??"UTC",calendar:"gregory",numberingSystem:"latn"} as const;
    const values=Object.fromEntries(new Intl.DateTimeFormat("en-US",{
      ...common,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",
      minute:"2-digit",second:"2-digit",hourCycle:"h23",
    }).formatToParts(date).map(p=>[p.type,p.value]));
    const locale=options.locale??"en-US";
    const month=(length:"short"|"long")=>new Intl.DateTimeFormat(locale,{...common,month:length}).format(date);
    const weekday=(length:"short"|"long")=>new Intl.DateTimeFormat(locale,{...common,weekday:length}).format(date);
    const h=Number(values.hour),h12=h%12||12;
    const pad=(n:number)=>String(n).padStart(2,"0");
    const table:Record<string,string>={
      d:String(Number(values.day)),dd:values.day!,ddd:weekday("short"),dddd:weekday("long"),
      M:String(Number(values.month)),MM:values.month!,MMM:month("short"),MMMM:month("long"),
      yy:values.year!.slice(-2),yyyy:values.year!.padStart(4,"0"),
      H:String(h),HH:pad(h),h:String(h12),hh:pad(h12),m:String(Number(values.minute)),mm:values.minute!,
      s:String(Number(values.second)),ss:values.second!,"am/pm":h<12?"am":"pm","AM/PM":h<12?"AM":"PM",
    };
    return parts.map(p=>"literal" in p?p.literal:table[p.token]!).join("");
  }catch{return undefined;}
}
