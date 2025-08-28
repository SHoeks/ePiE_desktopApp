import {execSync} from 'child_process'

export default function run_APIComplete_pyexec(FullPathToEXE, FullPathToChemFile){

  // output the command to the user
  document.getElementById('api_complete_cmd_path').innerText = FullPathToEXE + " " + `"${FullPathToChemFile}"`;
  var CMD_out_obj = document.getElementById('api_complete_cmd_out');
  CMD_out_obj.innerText = "";

  // run with execSync
  const result = execSync( FullPathToEXE + " " + `"${FullPathToChemFile}"`);  
  console.log(result.toString("utf8"));
  CMD_out_obj.innerText = result;
  CMD_out_obj.scrollTop = CMD_out_obj.scrollHeight;

}

