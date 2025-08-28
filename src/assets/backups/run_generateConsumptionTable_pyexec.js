import fs from 'fs'
import { dialog } from '@electron/remote'
import { execSync } from 'child_process'
// const path = require('path');
// import {spawn} from 'child_process'

export default function run_generateConsumptionTable_pyexec(FullPathToExec, BasinDataAccesExec, FullPathCSVFile, resourceDir, tempDir) {

    console.log("Generating Consumption Table");
    let obj = document.querySelector("#selected_basins_list").children;

    let cons_dat_type = document.querySelector("#cons_data_type_value_holder").innerText;
    console.log(cons_dat_type);

    if(obj.length == 0){
        dialog.showMessageBox({
            title: "Warning",
            message: 'No basins selected, please select at least one basin to continue',
            buttons: ['OK']
          })
        return 0;
    }

    let selected_basins = [];
    for (let i = 0; i < obj.length; i++) {
        let basin_txt = obj[i].innerText;
        basin_txt = basin_txt.split(":")[0]; // remove basin id
        basin_txt = basin_txt.replace(/"/g, ''); // remove double quotes from string
        selected_basins.push(basin_txt);
    }
    console.log(selected_basins);

    
    // run data access (BasinDataAccesExec)
    console.log("==>",BasinDataAccesExec);
    console.log("==>",resourceDir);
    console.log("==>",tempDir);
    const dbresult = execSync(BasinDataAccesExec + " c(" +  selected_basins.join(",") + ") " + `"${resourceDir}"` + " "+ `"${tempDir}"` + " " + `"c(pts)"`);  
    console.log(dbresult.toString("utf8"));
    
    // copy basin data to tmp dir    
    // let FullPathToExec2 = FullPathToExec.replace(/"/g, ''); // remove double quotes from string
    // console.log(FullPathToExec2);
    // let tmp_dir = path.dirname(FullPathCSVFile);
    // let pts_tmp = path.join(tmp_dir, 'pts.feather');
    // let pts_file = path.join(path.dirname(path.dirname(FullPathToExec2)), 'basins', 'pts.feather');
    // console.log(pts_tmp);
    // console.log(pts_file);
    //fs.copyFileSync(pts_file, pts_tmp);

    // run with execSync
    const result = execSync(FullPathToExec + " c(" +  selected_basins.join(",") + ") " + `"${FullPathCSVFile}"`);  
    console.log(result.toString("utf8"));

    console.log('loading csv data');
    let csv_path = FullPathCSVFile;

    let read_stream = fs.readFileSync(csv_path); //
    let csv_string = read_stream.toString();
    
    // split string by ;
    let csv_rows = csv_string.split('\n');
    let csv_data = [];
    for (let i = 0; i < csv_rows.length; i++) {
        let row = csv_rows[i].split(';');
        csv_data.push(row);
    }
    console.log(csv_data)

    // clear previous table 
    document.querySelector("#API_table_consumption > tbody:nth-child(1)").innerHTML = "";

    // add header 
    // document.querySelector("#API_table_consumption > tbody:nth-child(1)").innerHTML += 
    // `<tr>
    //       <th class="api_cons tableHeader5"> <span class="firstSpan">Country name<span class="secondSpan">Country name</span></span> </th>
    //       <th class="api_cons tableHeader5"> <span class="firstSpan">Country code<span class="secondSpan">Country two letter ISO codes</span></span> </th>
    //       <th class="api_cons tableHeader5"> <span class="firstSpan">WWTPs<span class="secondSpan">Number of WWTPs selected within basin of interest</span></span> </th>
    //       <th class="api_cons tableHeader5"> <span class="firstSpan">Ibuprofen<span class="secondSpan">Yearly consumption<p class="hover_unit">kg/year</p></span></span> </th>
    // </tr>`
    if(cons_dat_type=="country_totalkgyear" || cons_dat_type=="euavg_percapitygram"){
        document.querySelector("#API_table_consumption > tbody:nth-child(1)").innerHTML += 
        `<tr>
            <th class="api_cons tableHeader5"> <span class="firstSpan">Country<br><p>(name)</p><span class="secondSpan"> Country name </span></span> </th>
            <th class="api_cons tableHeader5"> <span class="firstSpan">Country<br><p>(iso code)</p><span class="secondSpan"> Country 2-letter iso code </span></span> </th>
            <th class="api_cons tableHeader5"> <span class="firstSpan">WWTPs<br><p>(count)</p><span class="secondSpan"> Number of WWTPs selected within basin of interest </span></span> </th>
            <th class="api_cons tableHeader5"> <span class="firstSpan">Ibuprofen<br><p>(kg/year)</p><span class="secondSpan"> Total yearly consumption in kg </span></span> </th>
        </tr>`
    }else if(cons_dat_type=="country_percapitagram"){
        document.querySelector("#API_table_consumption > tbody:nth-child(1)").innerHTML += 
        `<tr>
              <th class="api_cons tableHeader5"> <span class="firstSpan">Country<br><p>(name)</p><span class="secondSpan"> Country name </span></span> </th>
              <th class="api_cons tableHeader5"> <span class="firstSpan">Country<br><p>(iso code)</p><span class="secondSpan"> Country 2-letter iso code </span></span> </th>
              <th class="api_cons tableHeader5"> <span class="firstSpan">WWTPs<br><p>(count)</p><span class="secondSpan"> Number of WWTPs selected within basin of interest </span></span> </th>
              <th class="api_cons tableHeader5"> <span class="firstSpan">Ibuprofen<br><p>(g/capita/year)</p><span class="secondSpan"> Total yearly consumption in kg </span></span> </th>
        </tr>`
    }

    for( let i = 1; i < csv_data.length; i++){

        if(csv_data[i][0]=="") continue;
        
        // get data
        let cname = csv_data[i][2];
        cname = cname.replace(/"/g, '');
        let ccode = csv_data[i][0];
        ccode = ccode.replace(/"/g, '');
        let wnumber = csv_data[i][1];
        
        //print
        console.log(cname, ccode, wnumber);
        
        document.querySelector("#API_table_consumption > tbody:nth-child(1)").innerHTML +=
        `<tr>
        <td><input style="width: 120px;" class="tableFieldCons noteditable" type="text" id="cn_row${i}" value="${cname}"/></td>
        <td><input style="width: 120px;" class="tableFieldCons noteditable" type="text" id="c_row${i}" value="${ccode}"/></td>
        <td><input style="width: 120px;" class="tableFieldCons noteditable" type="text" id="w_row${i}" value="${wnumber}"/></td>
        <td><input onkeyup="setTableValues(this)" style="width: 120px;" class="tableFieldCons" type="text" id="api1_row${i}" value=""  /></td>
        </tr>`

    }

    document.getElementById("consHeaderHoverInfo").style.display = "block";

    if(cons_dat_type=="euavg_percapitygram"){
        document.querySelector("#avg_per_capita_cons_table").style.display = "block";
        document.querySelector("#div_container_pop_year").style.display = "block";

        document.querySelector("#API_table_consumption_avg_per_capita").innerHTML = "<tbody></tbody>";
        
        // add header
        document.querySelector("#API_table_consumption_avg_per_capita > tbody:nth-child(1)").innerHTML += 
        `<tr>
              <th class="api_cons tableHeader6"> <span class="firstSpan">API<br><p>(id)</p><span class="secondSpan"> API identifier </span></span> </th>
              <th class="api_cons tableHeader6"> <span class="firstSpan">Per capita consumption<br><p>(g/capita/year)</p><span class="secondSpan"> Average per capita consumption over all included basins and countries (g/capita/year) </span></span> </th>
        </tr>`

        // add data
        let api_n = 1;
        document.querySelector("#API_table_consumption_avg_per_capita > tbody:nth-child(1)").innerHTML += 
        `<tr>
        <td><input style="width: 120px;" class="tableFieldConsPerCapita noteditable" type="text" id="cPerCapitaAPIid_row${api_n}" value="Ibuprofen"/></td>
        <td><input style="width: 120px;" class="tableFieldConsPerCapita" type="text" id="cPercapitaValue_row${api_n}" value=""/></td>
        </tr>`


    }else{
        document.querySelector("#avg_per_capita_cons_table").style.display = "none";
    }
    
    if(cons_dat_type=="country_percapitagram") {
        document.querySelector("#div_container_pop_year").style.display = "block";
    }

    // turn of table edit view
    var fields = document.querySelectorAll("table input[type='text']");
    for (let i = 0; i < fields.length; i++) {
      fields[i].readOnly = true;
      fields[i].style.border = "none";
    }


    return 1;
}