import os
import ntpath
import sys
import re
import subprocess

    # Obtain the relevant paths
path_in       = sys.argv[1]
path_dir, path_file = ntpath.split(path_in)
path_dir_out  = sys.argv[2]
path_tmp      = path_dir + "/-tmp/" + path_file;
path_out      = path_dir_out + "/" + (os.path.splitext(path_file)[0]) + ".js"

    # Ensure the directories exist
    # and read the file
os.makedirs(path_dir + "/-tmp/", exist_ok=True)

with open (path_in, "r") as input_file:
    file_data = input_file.read()
 
out_write_file = ''
 
    # Directly insert the imports 
    # so everything is in one file
while 1:
    split_imp = file_data.split("/// [META] START IMPORTS", 1)
    if len(split_imp) == 1:
        out_write_file += split_imp[0]
        break
        
    out_write_file += split_imp[0];
        
    split_end = split_imp[1].split("/// [META] END IMPORTS", 1)
    
    imports = split_end[0].split("\n");
    for elem in imports:
        m = re.search(' from \'(.+?)\'', elem )
        if not m:
            continue
        imp = m.group(1)
        
        findPath = path_dir + "/" + imp + ".ts";
        if not os.path.isfile(findPath):
            print("Missing import file '" + findPath + "'")
            continue
        
        out_write_file += "\n\n// ------------- " + imp + " -----------------\n\n\n"
        
        with open (findPath, "r") as input_file:
            out_write_file += input_file.read()
    
        
    out_write_file += "\n\n// ------------- (end of headers) -----------------\n\n\n"
        
    file_data = split_end[1];
    
    # Write the output and use tsc to
    # transpile it to javascript
with open(path_tmp, "w") as text_file:
    text_file.write(out_write_file)
proc = subprocess.Popen(["tsc", path_tmp, "--outDir", path_dir_out, "--lib", "ES2015", "-jsx", "react"], shell=True)
proc.wait()

    # Read the file again and strip
    # away superfluous things
with open (path_out, "r") as input_file:
    file_data = input_file.read()
    
file_data = file_data.replace("\"use strict\";", "")

    # Remove comments
file_data = re.sub(r'/\*.*?\*/', '', file_data, flags=re.DOTALL)
file_data = re.sub(r'//.*?\n', '', file_data, flags=re.DOTALL)

    # We (ab)use the window variable to
    # get things like react as-if it is a 'require'
file_data = re.sub('require\((.*?)\)',r'Window[\1]', file_data, flags=re.DOTALL)

    # Remove superfluous export declarations
file_data = re.sub(r'(?m)^exports\..*?\n', '', file_data, flags=re.DOTALL)

    # Remove newlines and extra whitespace
file_data = " ".join(file_data.split())
   
with open(path_out, "w") as text_file:
    text_file.write(file_data)