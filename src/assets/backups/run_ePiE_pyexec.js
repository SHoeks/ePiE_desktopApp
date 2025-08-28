import {spawn} from 'child_process'
import { execSync } from 'child_process'
import { dialog } from '@electron/remote'
var appVersion = require('electron').remote.app.getVersion(); 
const path = require('path');
const fs = require("fs");

function csv_string_to_geojson(s,geojsonpath) {

  s = s.split(/\r?\n|\r|\n/g);
  let h = s[0].split(";");
  // console.log(h);
  // console.log(s);
  // find c_w in h
  let c_w_index = h.indexOf("C_w");
  let x_index = h.indexOf("x");
  let y_index = h.indexOf("y");
  console.log("c_w_index: ", c_w_index);
  console.log("x_index: ", x_index);
  console.log("y_index: ", y_index);

  let x = 0.0;
  let y = 0.0;
  let c_w = 0.0;

  let header = `{
    "type": "FeatureCollection",
    "name": "pts.geojson",
    "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
    "features": [`;
  let feature_template = ``;
  let footer = `]
  }`;
  let features = header + "\n";
  for (let i = 1; i < s.length; i++) {
    let line = s[i].split(";");
    x = line[x_index];
    y = line[y_index];
    c_w = line[c_w_index];
    if(c_w === undefined | c_w == "") c_w = null;
    if(x === undefined | x === "") continue;
    feature_template = `{ "type": "Feature", "properties": { "C_w": ${c_w} }, "geometry": { "type": "Point", "coordinates": [ ${x}, ${y} ] } }`
    if(i == s.length - 2) {
      features += feature_template + "\n";
    }else{
      features += feature_template + "," + "\n";
    }
  }
  features += "\n" + footer;
  //console.log(features);

  // write to geojson file
  fs.writeFileSync(geojsonpath, features);

}

export default function run_ePiE_pyexec(fullPyExecPath_run_ePiE, APIPropPath, ConsDataPath, BasinID, FlowSelect, rmFracPath, 
                                        BasinDataAccesExec, resourceDir, tempDir){

    // active button
    let btnSelector = "run_epie_btn";
    document.getElementById(btnSelector).style.color = "#ffffff"
    document.getElementById(btnSelector).style.background = "#b83734"
    document.getElementById(btnSelector).innerText = "Run ePiE: processing, please wait"

    // access data and extract pts and hl and the corresponding basin data
    console.log("Running ePiE model with the following parameters:", FlowSelect);
    console.log("==>",BasinDataAccesExec);
    console.log("==>",resourceDir);
    console.log("==>",tempDir);
    console.log("==>",BasinID);
    console.log("==>",FlowSelect);
    var dataRequestVector = "c(pts,hl,avg)"
    if(FlowSelect == "Min") dataRequestVector = "c(pts,hl,mi)" // consumption
    if(FlowSelect == "Max") dataRequestVector = "c(pts,hl,ma)" // consumption
    console.log("==>",dataRequestVector);
    const dbresult = execSync(BasinDataAccesExec + " " + `"${BasinID}"` + " " + `"${resourceDir}"` + " "+ `"${tempDir}"` + " " + `"${dataRequestVector}"`);  
    console.log(dbresult.toString("utf8"));

    var progress_capture_text = "";
    var progress_update_text = "";
    var processing_pts = false;
    var pts_to_process = 10e9;
    var pts_current_index = 0;
    var first_pts_process = false;
    var debug = false;

    var CMD_out_obj = document.getElementById('cmd_out');
    CMD_out_obj.innerText = "";

    // resourcePath
    let fullPyExecPath_run_ePiE2 = fullPyExecPath_run_ePiE.replace(/"/g, '');
    let resourcePath = path.dirname(path.dirname(fullPyExecPath_run_ePiE2));
    console.log(resourcePath);
    
    // geojsonpath
    let APIPropPath2 = APIPropPath.replace(/"/g, '');
    let tmppath = path.dirname(APIPropPath2);
    let geojsonpath = path.join(tmppath, 'pts.geojson');
    let csvpath = path.join(tmppath, 'pts_out.csv');
    console.log("geojsonpath: ",geojsonpath);
    console.log("csvpath: ",csvpath);
    
    document.getElementById('cmd_path').innerText = fullPyExecPath_run_ePiE;
    const child2 = spawn(fullPyExecPath_run_ePiE, [`"${APIPropPath}"`, `"${ConsDataPath}"`, `"${BasinID}"`, `"${FlowSelect}"`, `"${rmFracPath}"`, `"${tempDir}"`], {shell: true});
    
    var Progress_bar = document.getElementById("myBar");
    Progress_bar.style.width = "0" + "%";

    child2.stdout.on('data', (data) => {
      
      if(debug) console.log(`stdout: ${data}`);
      let data_str = data.toString();
      
      //if(data.includes("TRUE")) data_str=" ";
      let lines = data_str.split(/\r?\n|\r|\n/g);
      progress_update_text = "";
      
      for (let ll = 0; ll < lines.length; ll++) {
        let tmpstr = lines[ll]
        tmpstr = tmpstr.replace(/[[\]]/g, "");
        tmpstr = tmpstr.replace(/^1+/, "")
        tmpstr = tmpstr.replace(/["]/g, "");
        if(tmpstr.length > 0) progress_update_text = progress_update_text + tmpstr + "\n";
      }

      if(progress_update_text.includes("pts.geojson")){
        progress_update_text = "Writing results...\n"
      }

      if(progress_update_text.includes("fields and geometry type Point")){
        progress_update_text = "Done!\n"
      }

      if(progress_update_text != undefined) progress_capture_text += progress_update_text;

      if(data_str.includes("# points in pts:") & first_pts_process == false){
        first_pts_process = true;
        processing_pts = true;
        pts_to_process = parseInt(data_str.split("# points in pts: ")[1]);
      }else{
        processing_pts = false;
      }

      if(data_str.includes("# points in pts:") & first_pts_process){
        processing_pts = true;
        pts_current_index = parseInt(data_str.split("# points in pts: ")[1]);
      }else{
        processing_pts = false;
      }

      if(processing_pts){
        console.log(pts_to_process +"/"+ pts_current_index);
        let progress_prec = 100 - ( (pts_current_index/pts_to_process)*100 );
        if(progress_update_text.includes("Writing results")) progress_prec = 100;
        Progress_bar.style.width = progress_prec + "%";
      }
      
      CMD_out_obj.innerText = progress_capture_text;
      CMD_out_obj.scrollTop = CMD_out_obj.scrollHeight;

    });
    child2.stderr.on('data', (data) => {

      console.error(`stderr: ${data}`);

      if(data.includes("ePiE version")) {
        progress_capture_text += "ePiE interface version: " + appVersion + '\n'; // add app version
        progress_capture_text += `${data}`.replace("version", "model version") + '\n'; // add ePiE source code version
        CMD_out_obj.innerText = progress_capture_text;
        CMD_out_obj.scrollTop = CMD_out_obj.scrollHeight;
      }

      if(data.includes("Prediction not possible due to insufficient consumption data for")){

        dialog.showMessageBox({
          title: 'Insufficient consumption data',
          message: 'Prediction not possible due to insufficient consumption data',
          buttons: ['OK']
        })

      }

    });

    child2.on("close",code => {
      // de-active button
      document.getElementById(btnSelector).style.color = "black"
      document.getElementById(btnSelector).style.background = "white"
      document.getElementById(btnSelector).innerText = "Run ePiE"
      console.log(code)
      if(code==0){
        Progress_bar.style.width = "100" + "%";
      }else{
        Progress_bar.style.width = "0" + "%";
      }

      // read outputs
      let read_stream = fs.readFileSync(csvpath); //
      let csv_string = read_stream.toString();
      //console.log(csv_string);
      csv_string_to_geojson(csv_string, geojsonpath);
    });




}