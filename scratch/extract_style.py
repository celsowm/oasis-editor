import re
with open('temp_lorem_inspect/word/styles.xml', encoding='utf-8') as f:
    content = f.read()
match = re.search(r'<w:style w:type="table" w:styleId="TableGrid">.*?</w:style>', content)
if match:
    print(match.group(0))
else:
    print('Not found')
