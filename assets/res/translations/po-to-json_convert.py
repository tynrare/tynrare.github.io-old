#!/usr/bin/python

import sys
import json
import os
import re

# load file
if(len(sys.argv) == 1):
    print('File not specified');
else:
    print('Parse', sys.argv[1]);

with open(sys.argv[1]) as f:
    content = f.readlines()
content = [x.strip() for x in content]

# parse file
json_file = os.path.splitext(sys.argv[1])[0] + ".json"
data = {}

lastid = ""
laststr = ""

for line in content:
    if lastid == "":
        reg = re.search('msgid "(.+)"', line)
        if(reg):
            lastid = reg.group(1)
        else:
            lastid = ""
    else:
        reg = re.search('"(.*)"', line)
        if(reg):
            laststr += reg.group(1)
        else:
            laststr = laststr.replace('\\n', '&#010;') # we have to replace it with html "new-line" because python saves '\n' as '\\n'
            data[lastid] = laststr
            lastid = ""
            laststr = ""

print(data)

# save file
with open(json_file, 'w') as json_file:
    json.dump(data, json_file, sort_keys=False, indent=2, ensure_ascii=False, separators=(',', ': '))
