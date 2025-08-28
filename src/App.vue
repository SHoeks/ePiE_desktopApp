<script>
// /* eslint-disable */
import fs from 'fs'
import pathModule from 'path'
import { app } from '@electron/remote'
import { dialog } from '@electron/remote'
import { computed, ref } from 'vue'
// import {spawn} from 'child_process'
import Gradient from "javascript-color-gradient";
import FilesViewer from './components/FilesViewer'
// import { execSync } from 'child_process'
// var os = require('os');

// import xlsx from 'node-xlsx';
// import {fromEvent} from 'file-selector';

// import js functions
import openTab from './assets/openTab.js'
import openWelcomeTab from './assets/openWelcomeTab.js'
import checkTabLocks from './assets/checkTabLocks.js'
import tableToCSV from './assets/tableToCSV.js'
import tableConsToCSV from './assets/tableConsToCSV.js'
import tableRmFracToCSV from './assets/tableRmFracToCSV.js'
import editTabValues from './assets/editTabValues.js'
import saveTabValues from './assets/saveTabValues.js'
import createPNECOutputMap from './assets/createPNECOutputMap.js'
import createOutputMap from './assets/createOutputMap.js'
import createBasinMap from './assets/createBasinMap.js'
import getExcelAPIDataTemplate from './assets/getExcelAPIDataTemplate.js'
import loadCSVDataAPIDerived from './assets/loadCSVDataAPIDerived.js'
import removeLastAPItableRow from './assets/removeLastAPItableRow.js'
import addAPItableRow from './assets/addAPItableRow.js'
import loadExcelData from './assets/loadExcelData.js'
import copyOverAPI_ID from './assets/copyOverAPI_ID.js'
import populationPerCapConversion from './assets/populationPerCapConversion.js'
import getCountriesConsPop from './assets/getCountriesConsPop.js'
import exportSpatialGEOJSON from './assets/exportSpatialGEOJSON.js'
import exportFullOutputExcel from './assets/exportFullOutputExcel.js'
import CalculateBasinStatistics from './assets/CalculateBasinStatistics.js'
import formatSize from './assets/formatSize.js'

// javascript translations
import generateConsumptionTable from './assets/epie/generateConsumptionTable.js'
import completeChemProperties from './assets/epie/CompleteChemProperties.js'
import SimpleTreat4_0 from './assets/epie/SimpleTreat4_0.js'
import AccessBasinDB from './assets/epie/AccessBasinDB.js'
import RunModelePiE from './assets/epie/RunModelePiE.js'

var appVersion = require('electron').remote.app.getVersion(); 

import './assets/style.css'
import './assets/leaflet.css'

const varNcolors = 20;
const gradientArray = new Gradient()
.setColorGradient("#3F2CAF", "#edc988", "#e9446a")
.setMidpoint(varNcolors)
.getColors();
const varNcolorsCheck = gradientArray.length;

console.log(gradientArray);
console.log(varNcolorsCheck);

// check if in dev or prod mode
const isDevelopment = process.env.NODE_ENV !== 'production'
console.log('isDevelopment: ', isDevelopment);

// get the app root directory
var appRootDir = require('app-root-dir').get();
console.log("appRootDir: ",appRootDir)

// develop paths
// tmp file directory path
var fullTempPathDir = appRootDir+'/resources/tmp_data/';
var fullBasinResourceDir = appRootDir+'/resources/basins/';
var APIExcelTemplateFullPath = appRootDir+'/resources/model_inputs/chem_Oldenkamp2018_SI.xlsx';

// production paths
if(!isDevelopment) {
  fullTempPathDir = app.getPath("temp");
  APIExcelTemplateFullPath = appRootDir+'/model_inputs/chem_Oldenkamp2018_SI.xlsx';
  fullBasinResourceDir = appRootDir+'/basins/';
}
console.log("fullTempPathDir: ",fullTempPathDir)

// global setup var
var selected_basins = [];
var selected_basins_names = [];
selected_basins.splice(0,selected_basins.length)
selected_basins_names.splice(0,selected_basins_names.length)
var basinMapCreated = false;
//var lockedTabs = {Welcome_screen: true, File_browser: true, API_properties: true, Basin_select: true, Run_process: true, Map_results: true};
var lockedTabs = {Welcome_screen: false, File_browser: false, API_properties: false, Basin_select: false, Run_process: false, Map_results: false};
lockedTabs['Welcome_screen'] = false;

function setAppVersion() {
  let elem = document.querySelector("#appversionbox");
  elem.innerText = appVersion;
}

export default {
  name: 'App',
  mounted() {
    // on load function DOM access go here
    openWelcomeTab("Welcome_screen", 0); // load the welcome tab
    lockedTabs['Welcome_screen'] = false; // unlock the welcome tab
    lockedTabs['File_browser'] = false; // unlock the file browser tab
    lockedTabs['API_properties'] = false; // unlock the API properties tab
    console.log(lockedTabs)
    checkTabLocks(lockedTabs);
    setAppVersion(); // set the app version
  },
  components: { FilesViewer },
  setup() {
    const path = ref(app.getAppPath())
    const files = computed(() => {
      const fileNames = fs.readdirSync(path.value)
      return fileNames
        .map(file => {
          const stats = fs.statSync(pathModule.join(path.value, file))
          return {
            name: file,
            size: stats.isFile() ? formatSize(stats.size ?? 0) : null,
            directory: stats.isDirectory()
          }
        })
        .sort((a, b) => {
          if (a.directory === b.directory) {
            return a.name.localeCompare(b.name)
          }
          return a.directory ? -1 : 1
        })
    })

    const back = () => {
      path.value = pathModule.dirname(path.value)
    }
    const open = folder => {
      path.value = pathModule.join(path.value, folder)
    }

    const searchString = ref('')
    const filteredFiles = computed(() => {
      return searchString.value
        ? files.value.filter(s => s.name.startsWith(searchString.value))
        : files.value
    })

    function createBasinMapWrapper(){
      createBasinMap(selected_basins,selected_basins_names);
    }

    function createOutputMapWrapper(){
      createOutputMap(varNcolorsCheck, gradientArray, fullTempPathDir);
    }
    function createPNECOutputMapWrapper(){
      createPNECOutputMap(varNcolorsCheck, gradientArray, fullTempPathDir);
    }

    function exportSpatialGEOJSONWrapper(){
      exportSpatialGEOJSON(fullTempPathDir);
    }

    function exportFullOutputExcelWrapper(){
      exportFullOutputExcel(fullTempPathDir);
    }

    function getNrows(){
      for (var r = 1; r < 100; r++){
        if(document.getElementById("name_row" + r)==null){
          break
        }
      }
      r--;
      return r;
    }

    // r functions wrappers
    function runEPIEWrapper(){

      // button activity indication
      let btnSelector = "run_epie_btn";
      let cmd_activity = "cmd_out";
      document.getElementById(cmd_activity).innerText = ""; // clear
      document.getElementById("myBar").style.width = 0 + "%";

      console.log("---------------------------");	
      console.log("runEPIEWrapper");	
      console.log("---------------------------");	

      // debugging dont write new data to tmp dir continue with previous run
      var debugging = false;

      // file paths and parameters
      let tmp_csv_fullpath_apiProp = "";
      let tmp_csv_fullpath_cons = "";
      let tmp_csv_fullpath_rmFrac = "";
      let flowCondition = "Average";
      let basinIDs = selected_basins.join(",");
      basinIDs = "c(" + basinIDs + ")";
      console.log("Basin IDs:",basinIDs);

      if(!debugging) {
        // gather inputs 
        // (1) API properties
        tmp_csv_fullpath_apiProp = tableToCSV(fullTempPathDir,"API_run.csv");
        console.log("API in:",tmp_csv_fullpath_apiProp);
        // (2) basin selection
        if(selected_basins.length == 0){
          console.log("No basins selected");
          dialog.showMessageBox({
            title: "No basins selected",
            message: 'No basins selected, please select at least one basin to run the model',
            buttons: ['OK']
          })
          return;
        }

        // (3) Consumption data
        let rowsCons = document.querySelectorAll("#API_table_consumption > tbody > tr");
        if(rowsCons.length==0) {
          console.log("No consumption data available");
          dialog.showMessageBox({
            title: "No consumption data provided",
            message: 'No consumption data available, please generate consumption data first',
            buttons: ['OK']
          })
          return;
        }
        if(rowsCons.length>0) {
          let empty = false;
          for(let i = 0; i < (rowsCons.length); i++){
            let cell = rowsCons[i].lastElementChild.firstElementChild;
            if(cell.value==""){
              empty = true;
              break;
            }
          }
          if(empty){
            console.log("Consumption data incomplete");
            dialog.showMessageBox({
              title: "Consumption data incomplete",
              message: 'Please complete the consumption data table before running the model',
              buttons: ['OK']
            })
            return;
          }
        }
        tmp_csv_fullpath_cons = tableConsToCSV(fullTempPathDir,"Cons_run.csv");
        console.log("Basin IDs:",tmp_csv_fullpath_cons);

        // (4) Flow condition
        flowCondition = document.querySelector("#flow").value;
        console.log("flowCondition:",flowCondition);

        // (5) Get removal fractions
        tmp_csv_fullpath_rmFrac = tableRmFracToCSV(fullTempPathDir,"RmFrac_run.csv");
        console.log(tmp_csv_fullpath_rmFrac)
        let primRM = document.querySelector("#primaryFrac_row1").value;
        let secRM = document.querySelector("#secondaryFrac_row1").value;
        let primNaN = isNaN(parseFloat(primRM))
        let secNaN = isNaN(parseFloat(secRM))
        if(primNaN || secNaN) {
          console.log("No numeric value for primary and/or secondary removal fraction");
          dialog.showMessageBox({
            title: "Removal fractions not set",
            message: 'Please set the primary and secondary removal fractions before running the model',
            buttons: ['OK']
          })
          return;
        }

      }else{
        // debugging
        tmp_csv_fullpath_apiProp = fullTempPathDir+"/API_run.csv";
        tmp_csv_fullpath_cons = fullTempPathDir+"/Cons_run.csv";
        tmp_csv_fullpath_rmFrac = fullTempPathDir+"/RmFrac_run.csv";
        flowCondition = "Average";
        basinIDs = "c(107287)";
        console.log("Basin IDs:",basinIDs);
      }


      // compile data request vector for basin data access
      let dataRequestVector = "c(pts,hl,avg)"
      if(flowCondition == "Min") dataRequestVector = "c(pts,hl,mi)" // consumption
      if(flowCondition == "Max") dataRequestVector = "c(pts,hl,ma)" // consumption
      console.log("dataRequestVector:",dataRequestVector);


      const promise = new Promise((resolve, reject) => {
        let acccessresult = AccessBasinDB(basinIDs, fullBasinResourceDir, dataRequestVector, fullTempPathDir, btnSelector, cmd_activity);
        if (acccessresult) {
          resolve(acccessresult);
        } else {
          reject(acccessresult);
        }
      })

      promise.then(res => {
        console.log("Basin data access succesful PROMISE!!!!!!!!!!!!",res);
          // run the ePiE model (js)
          RunModelePiE(tmp_csv_fullpath_apiProp, tmp_csv_fullpath_cons, basinIDs, flowCondition, tmp_csv_fullpath_rmFrac, fullTempPathDir, btnSelector, cmd_activity);
          
      }).catch(err => {
          console.log("Basin data access failed",err);
          //return false; 
      })

      // // run the ePiE model
      // run_ePiE_pyexec(fullPyExecPath_run_ePiE, tmp_csv_fullpath_apiProp, tmp_csv_fullpath_cons, basinIDs, flowCondition, tmp_csv_fullpath_rmFrac,
      //                 fullPyExecPath_run_basinDataAccess, fullBasinResourceDir, fullTempPathDir);

      // map API ID copy
      let r = getNrows();
      let API_ids = [];
      for (let i = 1; i <= r; i++) API_ids.push(document.getElementById("name_row" + i).value);
      console.log("API_ids: ", API_ids);
      for (let i = 1; i <= r; i++) {
        document.querySelector("#Map_results > #API_map_selection > option").innerHTML = API_ids[i-1];
        document.querySelector("#Basin_result_stats > #API_map_selection > option").innerHTML = API_ids[i-1];
        document.querySelector("#PNEC_Map_results > #API_map_selection > option").innerHTML = API_ids[i-1];
      }


    }
    
    function runAPICompleteWrapper(){

      function getcolnames(headerNodeList){
        let colNames = [];
        for(let i = 0; i < headerNodeList.length; i++) {
          let innerTextTemp = headerNodeList[i].firstElementChild.innerText;
          console.log(innerTextTemp)
          innerTextTemp = innerTextTemp.split(/\r?\n/)[0]
          innerTextTemp = innerTextTemp.split(/([()])/)[0]
          colNames.push(innerTextTemp);
        }
        return colNames;
      }

      function getcoldata(colsData){
        let data = []; 
        for (let j = 0; j < colsData.length; j++) {
            if(colsData[j].value===""){
              data.push(null);
            }else{
              data.push(colsData[j].value);
            }
        }
        return data;
      }

      // gather inputs for APIComplete js function
      let rows = document.querySelectorAll("#API_table > tbody > tr") // Get each row data
      let rows2 = document.querySelectorAll("#API_table2 > tbody > tr") // Get each row2 data
      let rows3 = document.querySelectorAll("#API_table2alt > tbody > tr") // Get each row2 data
      let colHeader = rows[0].querySelectorAll('.tableHeader');
      let colHeader2 = rows2[0].querySelectorAll('.tableHeader2');
      let colHeader3 = rows3[0].querySelectorAll('.tableHeader2alt');
      let colNames = getcolnames(colHeader);
      let colNames2 = getcolnames(colHeader2);
      let colNames3 = getcolnames(colHeader3);
      console.log(colNames);
      console.log(colNames2);
      console.log(colNames3);
      let colsData = rows[1].querySelectorAll('.tableField');
      let colsData2 = rows2[1].querySelectorAll('.tableField2');
      let colsData3 = rows3[1].querySelectorAll('.tableField2alt');
      let colsd = getcoldata(colsData);
      let colsd2 = getcoldata(colsData2);
      let colsd3 = getcoldata(colsData3);
      console.log(colsd);
      console.log(colsd2);
      console.log(colsd3);

      // prepare chem
      let chem = {};
      for(let i = 0; i < colNames.length; i++) chem[colNames[i]] = colsd[i];
      for(let i = 0; i < colNames2.length; i++) chem[colNames2[i]] = colsd2[i];
      for(let i = 0; i < colNames3.length; i++) chem[colNames3[i]] = colsd3[i];
      
      // convert string to float for specific parameters
      let floatParams = ["MW","KOW_n","Pv","S","pKa","f_uf","k_bio_wwtp",
                         "KOW_n","Kp_ps_n","Kp_as_n","Kp_sd_n","KOC_n",
                         "KOW_alt","Kp_ps_alt","Kp_as_alt","Kp_sd_alt","KOC_alt"];
      for(let i = 0; i < floatParams.length; i++){
        let p = floatParams[i];
        if(chem[p]!=null){
          let pfloat = parseFloat(chem[p]);
          if(!isNaN(pfloat)) chem[p] = pfloat;
        }
      }
      console.log("chem:",chem);
      
      // preprocessing
      chem["k_bio_wwtp_n"] = chem["k_bio_wwtp"]
      chem["API"]
      let chemArray = [chem];
      console.log(chemArray);

      // complete chem properties
      let chem2 = completeChemProperties(chemArray); //!!
      console.log("chem2:",chem2);
      chem2[0]['metab'] = 0
      chem2[0]['API_metab'] = 0

      // write chem to to csv
      var headers = Object.keys(chem2[0]).join(";");
      var values = chem2.map(row =>
        Object.values(row).map(val => (val === null ? "" : val)).join(";")
      );
      var csvContent = [headers, ...values].join("\n");
      let csvPath = pathModule.join(fullTempPathDir,"API_derived.csv");
      fs.writeFileSync(csvPath, csvContent);
      console.log("CSV file written as test_chemicals.csv");


      // // write current properties of API basic table in app to tmp csv
      // let tmp_csv_fullpath = tableToCSV(fullTempPathDir,"API_basics.csv");
      // let run_R = false;

      // // run R script to complete API properties
      // run_APIComplete_pyexec(fullPyExecPath_APIComplete, tmp_csv_fullpath);
            
      let o = loadCSVDataAPIDerived(fullTempPathDir,"API_derived.csv");
      let derivedDataHeader = o[0];
      for(let i = 0; i < derivedDataHeader.length; i++) derivedDataHeader[i] = derivedDataHeader[i].replaceAll('"', '');
      for(let i = 0; i < derivedDataHeader.length; i++) derivedDataHeader[i] = derivedDataHeader[i].replaceAll('\r', '');
      for(let i = 0; i < derivedDataHeader.length; i++) derivedDataHeader[i] = derivedDataHeader[i].replaceAll('\n', '');
      let derivedData = [];
      for(let i = 1; i < o.length; i++){
        if(o[i].length>1) derivedData.push(o[i]);
      }
      let derivedDataRows = derivedData.length;
      console.log(derivedDataHeader);
      console.log(derivedData);
      console.log(derivedDataRows);

      //let colsToComplete = ["Kp_ps_n","Kp_as_n","Kp_sd_n","k_bio_wwtp_n","k_bio_sw1_n","T_bio_sw_n","k_hydro_sw_n","T_hydro_sw_n"];

      // fill table 2 if possible
      var targetDiv = document.getElementsByClassName("tableField2");
      var targetDivIds = [];
      for(let i = 0; i < targetDiv.length; i++) targetDivIds.push(targetDiv[i].id);
      console.log(targetDivIds);
      // check which targetDiv has value of ""
      for(let i = 0; i < targetDiv.length; i++) {
        if(targetDiv[i].value == ""){
          let colName = targetDiv[i].id.split("_row")[0];
          let rowIndex = targetDiv[i].id.split("_row")[1];
          let colIndex = derivedDataHeader.findIndex(x=>x==colName);
          let value = Math.round(derivedData[rowIndex-1][colIndex]*10000)/10000.00;
          console.log(rowIndex + " - " + colName + " - " + colIndex + " - " + value);
          targetDiv[i].value = value;
          targetDiv[i].setAttribute('value',value);
          if(colName!="KOW_n") {
            targetDiv[i].style.color = "#ff9000";
          } 
          if(colName=="k_bio_wwtp_n" && value==0) {
            targetDiv[i].style.color = "#ff0000";
          } 
        }
      }


      // fill table 2 alt if possible
      var targetDiv_alt = document.getElementsByClassName("tableField2alt");
      var targetDivIds_alt = [];
      for(let i = 0; i < targetDiv_alt.length; i++) targetDivIds_alt.push(targetDiv_alt[i].id);
      console.log(targetDivIds_alt);
      // check which targetDiv has value of ""
      for(let i = 0; i < targetDiv_alt.length; i++) {
        if(targetDiv_alt[i].value == ""){
          let colName = targetDiv_alt[i].id.split("_row")[0];
          console.log(colName);
          let rowIndex = targetDiv_alt[i].id.split("_row")[1];
          let colIndex = derivedDataHeader.findIndex(x=>x==colName);
          let value = Math.round(derivedData[rowIndex-1][colIndex]*10000)/10000.00;
          console.log(rowIndex + " - " + colName + " - " + colIndex + " - " + value);
          targetDiv_alt[i].value = value;
          targetDiv_alt[i].setAttribute('value',value); 
          targetDiv_alt[i].style.color = "#ff9000";
          if(colName=="k_bio_wwtp_alt" && value==0) {
            targetDiv_alt[i].style.color = "#ff0000";
          } 
        }
      }

      // check if k_bio_wwtp == 0 
      let cell = document.querySelector("#f_f_row1")
      let k_bio_wwtp = cell.value;
      k_bio_wwtp = parseFloat(k_bio_wwtp);
      console.log("k_bio_wwtp: ",k_bio_wwtp);
      if(k_bio_wwtp == 0){
        cell.style.color = "#ff0000";
      }
      if(k_bio_wwtp > 0){
        cell.style.color = "#000000";
      }
      if(isNaN(k_bio_wwtp)){
        cell.value = 0.0;
        cell.setAttribute('value',0.0); 
        cell.style.color = "#ff0000";
      }

      copyOverAPI_ID();
      console.log("chem2:",chem2[0]);
      
    }

    function openTabWrapper(evt, tabName){

      // check if tab is locked
      console.log("locked: " + tabName + " = " + lockedTabs[tabName]);

      // open tab if it is not locked
      if(!lockedTabs[tabName]){
        openTab(evt, tabName);

        // create the basin map if the basin tab is opened
        console.log("basinMapCreated: " + basinMapCreated);
        if(tabName == 'Basin_select'){
          createBasinMap(selected_basins,selected_basins_names);
          basinMapCreated = true;
        }
        // if(tabName == 'Basin_select' && !basinMapCreated){
        //   createBasinMap(selected_basins,selected_basins_names);
        //   basinMapCreated = true;
        // }
      }

      // check if in edit mode
      let c1 = document.querySelector("#save").style.display != "none";
      let c2 = document.querySelector("#save2").style.display != "none";
      let c3 = document.querySelector("#save3").style.display != "none";
      let c4 = document.querySelector("#save4").style.display != "none";
      if(c1 | c2 | c3 | c4){
        saveTabValues();
      }
      

    }

    function getFlowSelection(){
      let val = document.querySelector("#flow").value;
      console.log(val);
      
      let elem = document.querySelector("#prnt_slct_flow");
      elem.innerText = "";
      
      if(val == "Average"){
        elem.innerText = `Average`;
      }else if(val == "Min"){
        elem.innerText = `Minimum`;
      }else if(val == "Max"){
        elem.innerText = `Maximum`;
      }else{
        elem.innerText = `Average`;
      }

    }

    function setPopulationYear(){
      let val = document.querySelector("#pop_year").value;
      console.log(val);
      let elem = document.querySelector("#pop_year_value_holder");
      elem.innerText = val;

      // calculate API total kg cons per country if value is set
      var percapfield = document.querySelector("#cPercapitaValue_row1");
      if(percapfield!=null){
        let val = percapfield.value;
        console.log(val);
        if(val!=""){
          let percapitakg = parseFloat(val)/1000.00;
          console.log(percapitakg);

          let countriesPop = getCountriesConsPop();
          console.log(countriesPop);

          for(let i = 0; i < countriesPop.countries.length; i++){
            let country = countriesPop.countries[i];
            let selector = countriesPop.selectors[i];
            selector = selector.replace("c_row","api1_row");
            let pop = countriesPop.poparray[i];
            console.log(country,selector,pop);
            let cons = (percapitakg * pop).toFixed(3);
            console.log(cons);
            //if(document.querySelector(selector).value===""){
              document.querySelector(selector).value = cons;
            //}
          }

        }
      }
    }

    function selectConsDataType(){

      // get selection
      let val = document.querySelector("#cons_data_type").value;
      console.log(val);

      // check if current cons table is empty or not 
      let tableempty = document.querySelector("#API_table_consumption").innerHTML === "<tbody></tbody>"

      // chaning the cons data option will clear the current table
      if(!tableempty){
        console.log("Table not empty");
        dialog.showMessageBox({
          title: "Warning",
          message: 'Please note that changing the consumption data type will remove all current consumption data from the table\n\nAre you sure you want to continue?',
          buttons: ['OK','CANCEL']
        }).then(({ response }) => {
          if(response === 0){
            // set the value to a holder div
            let elem = document.querySelector("#cons_data_type_value_holder");
            elem.innerText = val;
            
            // remove current edit buttons
            document.querySelector("#cons_edit_buttons").style.display = "none";
            document.querySelector("#consHeaderHoverInfo").style.display = "none";

            // remove contents current table if selection is changed
            document.querySelector("#API_table_consumption").innerHTML = "<tbody></tbody>";
            document.querySelector("#API_table_consumption_avg_per_capita").innerHTML = "<tbody></tbody>";
            document.querySelector("#avg_per_capita_cons_table").style.display = "none";
            document.querySelector("#div_container_pop_year").style.display = "none";
          }else{
            console.log('CANCEL');
          }
        });
      }else{
        // set the value to a holder div
        let elem = document.querySelector("#cons_data_type_value_holder");
        elem.innerText = val;
      }

    }

    function getExcelAPIDataTemplateWrapper(){
      getExcelAPIDataTemplate(APIExcelTemplateFullPath);
    }

    function CalculateBasinStatisticsWrapper() {
      CalculateBasinStatistics(fullTempPathDir);
    }


    function OpenCloseCollapsible(id_use) {

      var content = document.getElementById(id_use);
      if (content.style.display === "block") {
      content.style.display = "none";
      } else {
        content.style.display = "block";
      }

    }

    function notYetDeveloped(){
      console.log("This feature is not yet developed");
      let btnname = event.target.innerHTML;
      console.log(btnname);
    
      dialog.showMessageBox({
        title: btnname,
        message: btnname + ' button clicked, this function requires further development',
        buttons: ['OK']
      })
    }

    function runSimpleTreat4(){
      
      console.log("runSimpleTreat4");
      
      // check if the api table is empty
      let check = false;
      let tf1 = document.querySelector("#API_properties").getElementsByClassName("tableField");
      let tf2 = document.querySelector("#API_properties").getElementsByClassName("tableField2");
      let tf3 = document.querySelector("#API_properties").getElementsByClassName("tableField2alt");
      for (let index = 0; index < tf1.length; index++) {
        if(tf1[index].value === "") check = true;
      }
      for (let index = 0; index < tf2.length; index++) {
        if(tf2[index].value === "") check = true;
      }
      for (let index = 0; index < tf3.length; index++) {
        if(tf3[index].value === "") check = true;
      }
      console.log("API table NA check: ",check);
      
      // quite function if check is true
      if(check){
        dialog.showMessageBox({
          title: "API properties incomplete",
          message: 'Please complete the API properties in Table 2 before running SimpleTreat4.0',
          buttons: ['OK']
        })
        return;
      }
      
      // gather inputs for SimpleTreat4.0 (write chem data as csv)
      let tmp_csv_fullpath = tableToCSV(fullTempPathDir,"API_run.csv");
      console.log("API in:",tmp_csv_fullpath);
      
      // run SimpleTreat4.0 (js)
      let out = SimpleTreat4_0(tmp_csv_fullpath,0);
      console.log("SimpleTreat4_0 js out:",out);
      
      // fill in primary and secondary removal fractions table
      let remPrimFloat = out.remPrim;
      let remSecFloat = out.remSec;
      let pf = remPrimFloat; //0.031;
      let sf = remSecFloat; //0.813;
      pf = Math.round(pf*100000)/100000.00;
      sf = Math.round(sf*100000)/100000.00;
      let div1 = document.getElementById("primaryFrac_row1");
      let div2 = document.getElementById("secondaryFrac_row1");
      div1.value = pf;
      div2.value = sf;
      div1.setAttribute('value',pf); 
      div2.setAttribute('value',sf); 
      div1.style.color = "#ff9000";
      div2.style.color = "#ff9000";
    
    }

    function run_generateConsumptionTableInner(){

      document.querySelector("#progress_gen_table_cons").style.display = "inline-block";
      
      if(selected_basins.length == 0){
        console.log("No basins selected");
        dialog.showMessageBox({
          title: "No basins selected",
          message: 'No basins selected, please select at least one basin to generate the consumption data table',
          buttons: ['OK']
        })
        document.querySelector("#progress_gen_table_cons").style.display = "none";
        return;
      }

      let out = generateConsumptionTable(fullBasinResourceDir, fullTempPathDir, selected_basins);
      console.log(out);
    
      
      // let tmp_csv_fullpath = tableToCSV(fullTempPathDir,"Cons_CountriesWWTP.csv");
      // console.log("tmp_csv_fullpath: ",tmp_csv_fullpath);
      // let succes = false;
      // succes = run_generateConsumptionTable_pyexec(fullPyExecPath_generateConsCountries, fullPyExecPath_run_basinDataAccess,
      //                                              tmp_csv_fullpath, fullBasinResourceDir, fullTempPathDir);
      // console.log("run_generateConsumptionTableInner succes: ",succes);
      
      let test = populationPerCapConversion("NL",2024);
      console.log("test: ",test);
      let countries = getCountriesConsPop();
      console.log(countries);

      // show loading info
      if(out==1) document.querySelector("#cons_edit_buttons").style.display = "inline-block";
      document.querySelector("#progress_gen_table_cons").style.display = "none";

    }

    function run_generateConsumptionTableWrapper(){

      console.log("run_generateConsumptionTableWrapper");

      // check if current cons table is empty or not 
      let tableempty = document.querySelector("#API_table_consumption").innerHTML === "<tbody></tbody>"
      if(!tableempty) console.log("Table not empty");
      run_generateConsumptionTableInner();
      copyOverAPI_ID();

 
    }



    return {
      path,
      open,
      back,

      loadExcelData,
      getExcelAPIDataTemplateWrapper,
      addAPItableRow,
      removeLastAPItableRow,

      editTabValues,
      saveTabValues,
      
      runEPIEWrapper,
      runAPICompleteWrapper,
      run_generateConsumptionTableWrapper,

      openTabWrapper,
      OpenCloseCollapsible,
      createOutputMapWrapper,
      createPNECOutputMapWrapper,
      createBasinMapWrapper,
      exportSpatialGEOJSONWrapper,
      exportFullOutputExcelWrapper,

      runSimpleTreat4,

      getFlowSelection,
      selectConsDataType,
      setPopulationYear,

      CalculateBasinStatisticsWrapper,

      notYetDeveloped,

      files,
      searchString,
      filteredFiles, 

      setAppVersion
    }
  }
}
</script>

<template>
<!-- <h2>Tabs</h2>
<p>Click on the buttons inside the tabbed menu:</p> -->

<div class="tab">
  <button id="tablink_Welcome_screen" class="tablinks" @click="openTabWrapper($event, 'Welcome_screen')">Welcome</button>
  <!-- <button id="tablink_File_browser" class="tablinks" @click="openTabWrapper($event, 'File_browser')">File Browser</button> -->
  <button id="tablink_API_properties" class="tablinks" @click="openTabWrapper($event, 'API_properties')">API properties</button>
  <button id="tablink_Degradation_select" class="tablinks" @click="openTabWrapper($event, 'Degradation')">WWTP removal</button>
  <button id="tablink_Basin_select" class="tablinks" @click="openTabWrapper($event, 'Basin_select')">River basin</button>
  <button id="tablink_Consumption_select" class="tablinks" @click="openTabWrapper($event, 'Consumption')">Consumption data</button>
  <button id="tablink_Run_process" class="tablinks" @click="openTabWrapper($event, 'Run_process')">Run ePiE</button>
  <button id="tablink_Map_results" class="tablinks" @click="openTabWrapper($event, 'Map_results')">Map results</button>
  <button id="tablink_Basin_result_stats" class="tablinks" @click="openTabWrapper($event, 'Basin_result_stats')">Output Statistics</button>
  <button id="tablink_PNEC_Map_results" class="tablinks" @click="openTabWrapper($event, 'PNEC_Map_results')">Map Risks</button>
</div>

<div class="tabbuffer"></div>

<div id="Welcome_screen" class="tabcontent">
  
  <h3>Welcome to ePiE</h3>
  <p style="margin-bottom: 16px; max-width: 1250px;">ePiE is a spatially explicit model that estimates concentrations of 
    active pharmaceutical ingredients (APIs) in surface waters across Europe (<a href="https://pubs.acs.org/doi/10.1021/acs.est.8b03862" target="_blank">Oldenkamp et al. 2018</a>). 
    Based on relatively few data entries such as national consumption data, compound properties and environmental fate parameters, 
    the ePiE model estimates average pharmaceutical concentrations in European river catchments. 
    This application was developed by Selwyn Hoeks at Radboud University supported by the PREMIER project to facilitate the use of the ePiE model.
  </p>   
  
  <div style="height: 8px;"></div>
  <hr> <!-- --------------------------------------------- -->
  <div style="height: 8px;"></div>

  <h4>Instructions</h4>
  
  <p>By clicking through the different tabs at the top of the page, you can parameterize and run the ePiE model. For defining the API properties there are two options:</p>
  <!-- <p><b>Contact details:</b> selwyn.hoeks@ru.nl</p> -->
  <ul>
    <li>You can make use of a pre-defined list of APIs for which the model is already parametrized (see <a href="https://pubs.acs.org/doi/10.1021/acs.est.8b03862" target="_blank">Oldenkamp et al. 2018</a>)</li>
    <li>You can parametrize the model yourself for new APIs by providing the required data entries. </li>
  </ul>

  <p style="margin-bottom:0px;">A comprehensive manual can be found here: <a href="https://shoeks.github.io/static_html/workinprogress.html" target="_blank">manual</a></p>
  <p>More details about the model equations can be found here: <a href="https://pubs.acs.org/doi/abs/10.1021/acs.est.8b03862" target="_blank">technical details</a></p>
    
  <div style="height: 8px;"></div>
  <hr> <!-- --------------------------------------------- -->
  <div style="height: 8px;"></div>

  <!-- 
  <h4>News</h4>
  <p>News updates would go here. For example new features or bug fixes.</p>
  <ul>
    <li>Update 1.091: New features added xxx, xxx</li>
    <li>Update 1.090: Bug fixes (xxx)</li>
    <li>Update 1.089: New features added xxx</li>
  </ul>
  
  <div style="height: 8px;"></div>
  <hr> 
  <div style="height: 8px;"></div>
  -->

  <h4>Update ePiE</h4>

  <p>Please check the following link to check if a more recent version is available: 
    <a href="https://shoeks.github.io/ePiE_desktopApp/" target="_blank">check for updates</a>
  </p>

  <p style="margin-bottom: 2px;">Current version: <b id="appversionbox" onload="setAppVersion()">vvv</b></p>
  <!-- <p>Current ePiE model version: <b>1.20</b></p> -->
    
  <div style="height: 20px;"></div>
  <hr> <!-- --------------------------------------------- -->
  <div style="height: 10px;"></div>

  <h4>Questions & support</h4>
  For any questions, please contact Selwyn Hoeks (selwyn.hoeks@ru.nl). 

</div>

<div id="File_browser" class="tabcontent">
    <div class="container mt-2">
      <h4>{{ path }}</h4>

      <div class="form-group mt-4 mb-2">
        <input
          v-model="searchString"
          class="form-control form-control-sm"
          placeholder="File search"
        />
      </div>

      <FilesViewer
        :files="filteredFiles"
        :nested="nested"
        @back="back"
        @folderclick="open($event.name)"
        />
      </div>
    </div>
    
<div id="API_properties" class="tabcontent">
  
  <h3>API properties</h3>
  <!-- <p>API specific physicochemical and environmental fate parameters can be entered here (using the tables below). Alternatively, API parameters can be loaded from an Excel file. An Excel template can be retrieved from the button below.</p> -->
  <p  style="max-width: 1250px;">
    In this tab, the API's physicochemical properties as well as fate properties need to be specified.
    API properties can be entered manually using the tables below or loaded from an Excel file. An Excel template with the values for 36 example APIs can be retrieved from the button 'Get Excel template'. 
    The Excel template includes a pre-defined list of APIs for which the model is already parametrized, these can be used directly, modified or replaced by new APIs. 
    <!-- In addition, the Excel template includes a metadata sheet with explanations for each parameter as well as the corrosponding unit. -->
  </p>
  <h4>Instructions:</h4>
  <ol style="max-width: 800px;">
    <li>For a new API you need to provide at least input values for Table 1 (compound properties), either fill them manually using the "Edit table" button or load the parameters from an Excel file.</li>
    <li>Values specified in Table 2 (fate parameters) can be filled when known or estimated using build-in QSARs by clicking the 'Calculate default values' button above Table 2.</li>
  </ol>
  <p>
    All values need to be filled in both tables need to be filled to continue.
  </p>
  
  <!-- <p style="margin-top: 10px; margin-bottom: 0px;">Initial API properties</p> -->
  <div style="margin-bottom: 1px;">
    <button type="button" class="action_button" @click="getExcelAPIDataTemplateWrapper()">Get Excel template</button>
    <button type="button" class="action_button" @click="loadExcelData()">Read Excel data</button>
  </div>
  
  <div style="height: 5px;"></div>
  <hr> <!-- --------------------------------------------- -->
  <div style="height: 10px;"></div>
  
  
  <h4>Table 1 - API properties</h4>
  <p>Please hover over the table headers to get an explanation of each parameter.</p>
  
  <div style="margin-bottom: 1px;">
    <button type="button" class="action_button" id="edit" @click="editTabValues()">Edit table</button>
    <button type="button" class="action_button" id="save" @click="saveTabValues()">Save table</button>
    <!-- <button type="button" class="action_button" @click="addAPItableRow()">Insert row</button> -->
    <!-- <button type="button" class="action_button" @click="removeLastAPItableRow()">Remove row</button> -->
  </div>

  <form class="API_table_form" id="form_table1_chem">
  <table id="API_table" cellspacing="0" cellpadding="4">
    <tbody>
      <tr>
          <th class="api tableHeader"> <span class="firstSpan">API<br><p>(id)</p><span class="secondSpan">Name of the active pharmaceutical ingredient (API)</span></span> </th>
          <th class="api tableHeader"> <span class="firstSpan">CAS<br><p>(number)</p><span class="secondSpan">CAS number</span></span> </th>
          <th class="api tableHeader"> <span class="firstSpan">class<br><p>(neutral/acid/base)</p><span class="secondSpan">Chemical class of the API <p class="hover_unit">(neutral/acid/base)</p></span></span> </th>
          <th class="api tableHeader"> <span class="firstSpan">MW<br><p>(g/mol)</p><span class="secondSpan">Molecular weight  (for APIs that are salts: preferably enter molecular weight of free acid/base) <p class="hover_unit">(g/mol)</p></span></span> </th>
          <th class="api tableHeader"> <span class="firstSpan">KOW_n<br><p>(-)</p><span class="secondSpan">Octanol/water partitioning coefficient of the neutral form<p class="hover_unit">-</p></span></span> </th>
          <th class="api tableHeader"> <span class="firstSpan">Pv<br><p>(Pa)</p><span class="secondSpan">Vapour pressure at 25 °C <p class="hover_unit">Pa</p></span></span> </th>
          <th class="api tableHeader"> <span class="firstSpan">S<br><p>(mg/L)</p><span class="secondSpan">Solubility in water at 25 °C <p class="hover_unit">mg/L</p></span></span> </th>
          <th class="api tableHeader"> <span class="firstSpan">pKa<br><p>(-)</p><span class="secondSpan">Acid dissociation coefficient <p class="hover_unit">-</p></span></span> </th>
          <th class="api tableHeader"> <span class="firstSpan">f_uf<br><p>(-)</p><span class="secondSpan">Fraction of dose excreted unchanged via urine <p class="hover_unit">-</p></span></span> </th>
          <th class="api tableHeader"> <span class="firstSpan">k_bio_wwtp<br><p>(-)</p><span class="secondSpan">First order biodegradation rate constant for secondary treatment <p class="hover_unit">-</p></span></span> </th>
          <!-- <th class="api tableHeader">metab</th>
          <th class="api tableHeader">API_metab</th> -->
      </tr>
      <tr>
        <td><input style="width: 120px;" class="tableField" type="text" id="name_row1" value="Ibuprofen" readonly /></td>
        <td><input style="width: 120px;" class="tableField" type="text" id="cas_row1" value="15687-27-1" readonly /></td>
        <td><input style="width: 120px;" class="tableField" type="text" id="class_row1" value="acid" readonly /></td>
        <td><input style="width: 120px;" class="tableField" type="text" id="MW_row1"   value="206.2808" readonly /></td>
        <td><input style="width: 120px;" class="tableField" type="text" id="KOW_n_row1" value="9332.543" readonly /></td>
        <td><input style="width: 120px;" class="tableField" type="text" id="Pv_row1"  value="0.0248" readonly /></td>
        <td><input style="width: 120px;" class="tableField" type="text" id="S_row1"   value="21" readonly /></td>
        <td><input style="width: 120px;" class="tableField" type="text" id="pKa_row1" value="4.85" readonly /></td>
        <td><input style="width: 120px;" class="tableField" type="text" id="f_u_row1" value="0.2" readonly /></td>
        <td><input style="width: 120px;" class="tableField" type="text" id="f_f_row1" value="0.0" readonly /></td>
        <!-- <td><input style="width: 100px;" class="tableField" type="text" id="metab_1" value="0" readonly /></td>
        <td><input style="width: 100px;" class="tableField" type="text" id="API_metab_1" value="" readonly /></td> -->
      </tr>
    </tbody>
  </table>
  </form>
  
  <div style="height: 20px;"></div>
  <hr> <!-- --------------------------------------------- -->
  <div style="height: 10px;"></div>
  
  <h4>Table 2 - API-specific fate parameters</h4>
  <!-- <p>tabcontent.</p> -->
  <!-- <p style="margin-top: 40px; margin-bottom: 0px;">Complete API properties</p> -->
  <!-- <p style="margin-top: 10px; margin-bottom: 0px;">Derived API properties</p> -->

  <div style="margin-bottom: 1px;">
    <button id="runAPIcompletebtn" type="button" class="action_button" @click="runAPICompleteWrapper()">Calculate default values</button>
    <button type="button" class="action_button" id="edit" @click="editTabValues()">Edit table</button>
    <button type="button" class="action_button" id="save2" @click="saveTabValues()">Save table</button>
    <!-- <button type="button" class="action_button" @click="addAPItableRow()">Insert row</button> -->
    <!-- <button type="button" class="action_button" @click="removeLastAPItableRow()">Remove row</button> -->
  </div>

  <form class="API_table_form" id="form_table2_chem">
  <table id="API_table2" cellspacing="0" cellpadding="4">
    <tbody>
      <tr>
        <!-- Kp_ps; Kp_as;	Kp_susp; Kp_sd;	KOC;	k_bio_wwtp;	k_bio_sw1;	T_bio_sw;	k_bio_sd1;	T_bio_sd; k_hydro_sw;	T_hydro_sw;	k_hydro_sd;	T_hydro_sd;	lambda_solar;	k_photo12_sw;  -->

          <th class="api2 tableHeader2"> <span class="firstSpan">API<br><p>(id)</p><span class="secondSpan"> Name of the active pharmaceutical ingredient (API) </span></span> </th>
          <!--<th class="api2 tableHeader2"> <span class="firstSpan">KOW_n<br><p>(-)</p><span class="secondSpan">Octanol/water partitioning coefficient of the neutral form<p class="hover_unit">-</p></span></span> </th> -->
          <th class="api2 tableHeader2"> <span class="firstSpan">Kp_ps_n<br><p>(L/kg)</p><span class="secondSpan">Sewage-solids water partitioning coefficient of neutral form <p class="hover_unit">L water/kg solids</p></span></span> </th>
          <th class="api2 tableHeader2"> <span class="firstSpan">Kp_as_n<br><p>(L/kg)</p><span class="secondSpan">Activated sludge-solids water partitioning coefficient of neutral form <p class="hover_unit">L water/kg solids</p></span></span> </th>
          <th class="api2 tableHeader2"> <span class="firstSpan">Kp_sd_n<br><p>(L/kg)</p><span class="secondSpan">Sediment-solids water partitioning coefficient of neutral form <p class="hover_unit">L water/kg solids</p></span></span> </th>
          <th class="api2 tableHeader2"> <span class="firstSpan">KOC_n<br><p>(-)</p><span class="secondSpan"> ... <p class="hover_unit">...</p></span></span> </th>

          <!-- <th class="api2 tableHeader2"> <span class="firstSpan">k_bio_wwtp_n<br><p>(s-1)</p><span class="secondSpan">First order biodegradation rate constant secondary treatment of neutral form <p class="hover_unit">s-1</p></span></span> </th> -->
          <!-- <th class="api2 tableHeader2"> <span class="firstSpan">k_bio_sw1_n<br><p>(s-1)</p><span class="secondSpan">Pseudo-first order experimental biodegradation rate constant in surface water of neutral form <p class="hover_unit">s-1</p></span></span> </th>-->
          <!-- <th class="api2 tableHeader2"> <span class="firstSpan">T_bio_sw_n<br><p>(K)</p><span class="secondSpan">Temperature at which kbio in surface water was derived of neutral form <p class="hover_unit">K</p></span></span> </th> -->
          <!-- <th class="api2 tableHeader2"> <span class="firstSpan">k_hydro_sw_n<br><p>(s-1)</p><span class="secondSpan">First order experimental hydrolysis rate constant in surface water of neutral form <p class="hover_unit">s-1</p></span></span> </th> -->
          <!-- <th class="api2 tableHeader2"> <span class="firstSpan">T_hydro_sw_n<br><p>(K)</p><span class="secondSpan">Temperature at which khydro in surface water was derived of neutral form <p class="hover_unit">K</p></span></span> </th> -->
          
          <!-- <th class="api2 tableHeader2"> <span class="firstSpan">lambda_solar_n<span class="secondSpan">... <p class="hover_unit">... </p></span></span> </th>
          <th class="api2 tableHeader2"> <span class="firstSpan">k_photo12_sw_n<span class="secondSpan">... <p class="hover_unit">... </p></span></span> </th>
          <th class="api2 tableHeader2"> <span class="firstSpan">T_photo12_sw_n<span class="secondSpan">... <p class="hover_unit">K</p></span></span> </th> -->

      </tr>
      <tr>
        
        <td><input style="width: 120px;" class="tableField2" type="text" id="API_ID_tab2_row1" value="" readonly /></td>
        <!--<td><input style="width: 120px;" class="tableField2" type="text" id="KOW_n_row1" value="" readonly /></td>-->
        <td><input style="width: 120px;" class="tableField2" type="text" id="Kp_ps_n_row1" value="" readonly /></td>
        <td><input style="width: 120px;" class="tableField2" type="text" id="Kp_as_n_row1" value="" readonly /></td>
        <td><input style="width: 120px;" class="tableField2" type="text" id="Kp_sd_n_row1" value="" readonly /></td>
        <td><input style="width: 120px;" class="tableField2" type="text" id="KOC_n_row1" value="" readonly /></td>
        <!-- <td><input style="width: 120px;" class="tableField2" type="text" id="k_bio_wwtp_n_row1" value="" readonly /></td> -->
        <!-- <td><input style="width: 120px;" class="tableField2" type="text" id="k_bio_sw1_n_row1" value="" readonly /></td> -->
        <!-- <td><input style="width: 120px;" class="tableField2" type="text" id="T_bio_sw_n_row1" value="" readonly /></td> -->
        <!-- <td><input style="width: 120px;" class="tableField2" type="text" id="k_hydro_sw_n_row1" value="" readonly /></td> -->
        <!-- <td><input style="width: 120px;" class="tableField2" type="text" id="T_hydro_sw_n_row1" value="" readonly /></td> -->
        <!-- <td><input style="width: 120px;" class="tableField2" type="text" id="lambda_solar_n_row1" value="" readonly /></td>
        <td><input style="width: 120px;" class="tableField2" type="text" id="k_photo12_sw_n_row1" value="" readonly /></td>
        <td><input style="width: 120px;" class="tableField2" type="text" id="T_photo12_sw_n_row1" value="" readonly /></td> -->

      </tr>
    </tbody>
  </table>
  </form>


  
  <form class="API_table_form" id="form_table2alt_chem">
  <table id="API_table2alt" cellspacing="0" cellpadding="4">
    <tbody>
      <tr>
        <!-- Kp_ps; Kp_as;	Kp_susp; Kp_sd;	KOC;	k_bio_wwtp;	k_bio_sw1;	T_bio_sw;	k_bio_sd1;	T_bio_sd; k_hydro_sw;	T_hydro_sw;	k_hydro_sd;	T_hydro_sd;	lambda_solar;	k_photo12_sw;  -->

          <th class="api2 tableHeader2alt"> <span class="firstSpan">API<br><p>(id)</p><span class="secondSpan"> Name of the active pharmaceutical ingredient (API) </span></span> </th>
          <th class="api2alt tableHeader2alt"> <span class="firstSpan">KOW_alt<br><p>(-)</p><span class="secondSpan">Octanol/water partitioning coefficient of the alternative form<p class="hover_unit">-</p></span></span> </th>
          <th class="api2alt tableHeader2alt"> <span class="firstSpan">Kp_ps_alt<br><p>(L/kg)</p><span class="secondSpan">Sewage-solids water partitioning coefficient of alternative form <p class="hover_unit">L water/kg solids</p></span></span> </th>
          <th class="api2alt tableHeader2alt"> <span class="firstSpan">Kp_as_alt<br><p>(L/kg)</p><span class="secondSpan">Activated sludge-solids water partitioning coefficient of alternative form <p class="hover_unit">L water/kg solids</p></span></span> </th>
          <th class="api2alt tableHeader2alt"> <span class="firstSpan">Kp_sd_alt<br><p>(L/kg)</p><span class="secondSpan">Sediment-solids water partitioning coefficient of alternative form <p class="hover_unit">L water/kg solids</p></span></span> </th>
          <th class="api2alt tableHeader2alt"> <span class="firstSpan">KOC_alt<br><p>(-)</p><span class="secondSpan"> ... <p class="hover_unit">...</p></span></span> </th>
    

          <!-- <th class="api2alt tableHeader2alt"> <span class="firstSpan">k_bio_wwtp_alt<br><p>(s-1)</p><span class="secondSpan">First order biodegradation rate constant secondary treatment of alternative form <p class="hover_unit">s-1</p></span></span> </th> -->
          <!-- <th class="api2alt tableHeader2alt"> <span class="firstSpan">k_bio_sw1_alt<br><p>(s-1)</p><span class="secondSpan">Pseudo-first order experimental biodegradation rate constant in surface water of alternative form <p class="hover_unit">s-1</p></span></span> </th> -->
          <!-- <th class="api2alt tableHeader2alt"> <span class="firstSpan">T_bio_sw_alt<br><p>(K)</p><span class="secondSpan">Temperature at which kbio in surface water was derived of alternative form <p class="hover_unit">K</p></span></span> </th> -->
          <!-- <th class="api2alt tableHeader2alt"> <span class="firstSpan">k_hydro_sw_alt<br><p>(s-1)</p><span class="secondSpan">First order experimental hydrolysis rate constant in surface water of alternative form <p class="hover_unit">s-1</p></span></span> </th> -->
          <!-- <th class="api2alt tableHeader2alt"> <span class="firstSpan">T_hydro_sw_alt<br><p>(K)</p><span class="secondSpan">Temperature at which khydro in surface water was derived of alternative form <p class="hover_unit">K</p></span></span> </th> -->
          
          <!-- <th class="api2alt tableHeader2alt"> <span class="firstSpan">lambda_solar_n<span class="secondSpan">... <p class="hover_unit">... </p></span></span> </th>
          <th class="api2alt tableHeader2alt"> <span class="firstSpan">k_photo12alt_sw_n<span class="secondSpan">... <p class="hover_unit">... </p></span></span> </th>
          <th class="api2alt tableHeader2alt"> <span class="firstSpan">T_photo12alt_sw_n<span class="secondSpan">... <p class="hover_unit">K</p></span></span> </th> -->

      </tr>
      <tr>
        
        <td><input style="width: 120px;" class="tableField2alt" type="text" id="API_ID_tab2alt_row1" value="" readonly /></td>
        <td><input style="width: 120px;" class="tableField2alt" type="text" id="KOW_alt_row1" value="" readonly /></td>
        <td><input style="width: 120px;" class="tableField2alt" type="text" id="Kp_ps_alt_row1" value="" readonly /></td>
        <td><input style="width: 120px;" class="tableField2alt" type="text" id="Kp_as_alt_row1" value="" readonly /></td>
        <td><input style="width: 120px;" class="tableField2alt" type="text" id="Kp_sd_alt_row1" value="" readonly /></td>
        <td><input style="width: 120px;" class="tableField2alt" type="text" id="KOC_alt_row1" value="" readonly /></td>
        <!-- <td><input style="width: 120px;" class="tableField2alt" type="text" id="k_bio_wwtp_alt_row1" value="" readonly /></td> -->
        <!-- <td><input style="width: 120px;" class="tableField2alt" type="text" id="k_bio_sw1_alt_row1" value="" readonly /></td> -->
        <!-- <td><input style="width: 120px;" class="tableField2alt" type="text" id="T_bio_sw_alt_row1" value="" readonly /></td> -->
        <!-- <td><input style="width: 120px;" class="tableField2alt" type="text" id="k_hydro_sw_alt_row1" value="" readonly /></td> -->
        <!-- <td><input style="width: 120px;" class="tableField2alt" type="text" id="T_hydro_sw_alt_row1" value="" readonly /></td> -->
        <!-- <td><input style="width: 120px;" class="tableField2alt" type="text" id="lambda_solar_alt_row1" value="" readonly /></td>
        <td><input style="width: 120px;" class="tableField2alt" type="text" id="k_photo12_sw_alt_row1" value="" readonly /></td>
        <td><input style="width: 120px;" class="tableField2alt" type="text" id="T_photo12_sw_alt_row1" value="" readonly /></td> -->

      </tr>
    </tbody>
  </table>
  </form>

  <!-- <div style="margin-bottom: 2px;margin-top: 10px;">
    <button type="button" class="action_button" @click="OpenCloseCollapsible('api_tab2_prop_info')">More information</button>
    <div id="api_tab2_prop_info" class="collapsible_content">
    <p>Needs further work:</p>
    <p><b>Kp_ps_n</b> explanation...</p>
    <p><b>Kp_as_n</b> explanation...</p>
    <p><b>Kp_sd_n</b> explanation...</p>
    <p>Source: ...</p>
    </div>
  </div> -->

  <div class="debugging" style="background-color: #999999; margin-top: 10px;">
    <div style="height: 0px;"></div>
    <hr > <!-- --------------------------------------------- -->
    <div style="height: 10px;"></div>
    <h4 style="color:orange;">DEV</h4>
  <p id="api_complete_cmd_path" style="margin-top: 10px; margin-bottom: 10px;" class="debugging">paths</p>
  <p id="api_complete_cmd_out" style="margin-top: 10px; margin-bottom: 10px;" class="debugging">out</p>
  </div>

</div>

<div id="Basin_select" class="tabcontent">
  <h3>River basin selection</h3>
  <p style="max-width: 1250px;">
    Use the map below to select one or multiple river basins to compute surface water concentrations for. 
    You can remove already selected basins by clicking on them for a second time or by clicking on their ID listed below the map.
  </p>

  <h4>Instructions:</h4>
  <ol style="max-width: 800px;">
    <li>Select one or multiple basins, the selected basins list below the map shows which basins ePiE will be run for.</li>
    <li>Select the desired flow conditions from the drop down menu at the bottom of the screen.</li>
  </ol>
  <p>
    The basin map can be reloaded when needed (for example when the map does not load properly).
  </p>
  
  <!-- <p>tabcontent.</p> -->
  <div style="display: block;justify-content: left; width: 1345 px; max-width: 1365px; ">
    <button id="reload_basin_map_btn" type="button" @click="createBasinMapWrapper()">Reload basin map</button>
    <div style="float:right;margin-top: 0px; margin-bottom: 0px;float: right;" id="hooveringBasinDiv">
      <div id="basinhoveridbox">None</div>
    </div>
  </div>

  <div id="osm_map"></div>
  <div id="mapBasinholder"><div id="mapBasin"></div></div>
  <div style="margin-top: 5px; margin-bottom: 3px;" id="selected_basins_p">Selected basins:</div>
  <ul id="selected_basins_list"></ul>
  <div style="height: 1px;"></div>
  <hr> <!-- --------------------------------------------- -->
  <div style="height: 5px;"></div>
  <h4>Select flow conditions</h4>
  <p  style="max-width: 1250px;">ePiE has the option to make predictions for the longterm yearly average flow, minimum and maximum flow conditions for the years 2000-2015. 
    The default option is average yearly flow. Use the drop-down menu below to change the flow conditions.</p>
  <div id="prnt_slct_flow_div" style="display: flex; justify-content: left;">
    <form style="margin-top: -5px;">
      <label for="flow">Set flow condition: </label>
      <select @change="getFlowSelection()" name="flow" id="flow">
        <option value="Average">Average yearly flow</option>
        <option value="Min">Minimum yearly flow</option>
        <option value="Max">Maximum yearly flow</option>
      </select>
      <!-- <button type="button" style="margin-left: 10px;" class="action_button" @click="getFlowSelection()">Confirm</button> -->
    </form>
    <p>Selected flow: </p><p id="prnt_slct_flow">Average</p>
  </div>  
</div>

<div id="Degradation" class="tabcontent">

  
  <h4>WWTP removal</h4>
  <!-- <p>Use SimpleTreat 4.0 to retreive estimates for primary and secondary removal fractions, alternatively the values calculated by SimpleTreat 4.0 can be overwritten in the table below.</p> -->
  <p style="max-width: 1250px;">Within the ePiE model, locations and specifications of European wastewater treatment plants (WWTPs) are based on the 'Urban Waste Water Treatment Database' (UWWTD). 
    Please note that therefore, small treatment plants (less then 2000 population equivalents) are not integrated into ePiE. 
    To account for wastewater treatment within ePiE, removal fractions per API are required for each individual treatment step within a WWTP. 
    Primary and secondary removal rates can be estimated via SimpleTreat 4.0 (based on compound properties) or entered manually (e.g. based on experimental or literature data). 
    <!-- Removal fractions for advanced treatment steps can be entered manually (if applicable) but are not strictly required to compute results within ePiE. -->
  </p>

  <h4>Instructions:</h4>
  <ul style="max-width: 800px;">
    <li>Run SimpleTreat 4.0, possible when the tables on the previous tab are all filled.</li>
    <li>Or, click "Edit table" and fill the removal fractions manually.</li>
  </ul>
  <p>
    Removal fractions need to be between 0 and 1.
  </p>

  <button type="button" class="action_button" @click="OpenCloseCollapsible('simpletreatinfo')">More information</button>
  <div id="simpletreatinfo" class="collapsible_content">
  <p>The definitions of individual treatment steps used within ePiE are based on the EU Urban Waste Water Treatment Directive and the in OECD glossary:</p>
  <p><b>Primary treatment</b>  refers to the “treatment of urban wastewater by a physical and/or chemical process involving settlement of suspended solids, or other processes in which the BOD5 of the incoming waste water is reduced by at least 20 % before discharge and the total suspended solids of the incoming waste water are reduced by at least 50 %”.</p>
  <p><b>Secondary treatment</b>  is the second step in most waste treatment systems during which bacteria consume the organic parts of the wastes. This is accomplished by bringing the sewage, bacteria and oxygen together in trickling filters or within an activated sludge process. Secondary treatment removes all floating and settleable solids and about 90 per cent of the oxygen—demanding substances and suspended solids. Disinfection by chlorination is the final stage of the secondary treatment process. </p>
  <!-- <p><b>Tertiary treatment</b> is the advanced treatment process, following secondary treatment of wastewater, that produces high—quality water. Tertiary treatment includes removal of nutrients such as phosphorus and nitrogen and practically all suspended and organic matter from wastewater.</p> -->
  <!-- <p><b>Advanced treatment</b> technology (wastewater) refers to processes capable of reducing specific constituents in wastewater not normally achieved by other treatment options. It covers all unit operations that are not considered to be mechanical or biological, for example, chemical coagulation, flocculation and precipitation, break- point chlorination, stripping, mixed-media filtration, micro-screening, selective ion exchange, activated carbon absorption, reverse osmosis, ultrafiltration and electroflotation. Advanced treatment processes may be used in conjunction with mechanical and biological treatment operations.</p> -->
  <p>Source: Glossary of Environment Statistics, Studies in Methods, Series F, No. 67, United Nations, New York, 1997</p>
  </div>


  <div style="height: 10px;"></div>
  <hr> <!-- --------------------------------------------- -->
  <div style="height: 10px;"></div>
  <h4>Table 3 - Removal due to primary and secondary treatment steps</h4>
  
  <div style="margin-bottom: 1px;">
    <button id="simpletreat40_btn" class="action_button" type="button" style="margin-bottom: 1rem;margin-top: 10px;" 
            @click="runSimpleTreat4()">Run SimpleTreat 4.0</button>
    <button type="button" class="action_button" id="edit" @click="editTabValues()">Edit table</button>
    <button type="button" class="action_button" id="save3" @click="saveTabValues()">Save table</button>
    <!-- <button type="button" class="action_button" @click="addAPItableRow()">Insert row</button> -->
    <!-- <button type="button" class="action_button" @click="removeLastAPItableRow()">Remove row</button> -->
  </div>


  <form class="API_table_form" style="max-width: 800px;">
    <table id="API_table_degradation" cellspacing="0" cellpadding="4">
      <tbody>
        <tr>
          <th class="api2 tableHeader3"> <span class="firstSpan">API (ID)<span class="secondSpan">Explanation1</span></span> </th>
          <th class="api2 tableHeader3"> <span class="firstSpan">Primary removal fraction<span class="secondSpan">Explanation1</span></span> </th>
          <th class="api2 tableHeader3"> <span class="firstSpan">Secondary removal fraction<span class="secondSpan">Explanation2</span></span> </th>
        </tr>
        <tr>
          <td><input style="width: 120px;" class="tableField3" type="text" id="API_ID_tab2_row1" value="Ibuprofen" readonly /></td>
          <td><input style="width: 280px;" class="tableField3" type="text" id="primaryFrac_row1" value="" readonly /></td>
          <td><input style="width: 280px;" class="tableField3" type="text" id="secondaryFrac_row1" value="" readonly /></td>
        </tr>
      </tbody>
    </table>
  </form>
  
  
  <div style="height: 10px;"></div>
  <hr> <!-- --------------------------------------------- -->
  <div style="height: 10px;"></div>
  <div style="display: none;">
  <h4>Table 4 - Additional removal due to advanced treatment steps</h4>
  <p>Advanced removal fractions need be set manually.</p>

  <div style="margin-bottom: 1px;">
    <button type="button" class="action_button" id="edit" @click="editTabValues()">Edit table</button>
    <button type="button" class="action_button" id="save4" @click="saveTabValues()">Save table</button>
    <!-- <button type="button" class="action_button" @click="addAPItableRow()">Insert row</button> -->
    <!-- <button type="button" class="action_button" @click="removeLastAPItableRow()">Remove row</button> -->
  </div>

  <form class="API_table_form" style="max-width: 1200px;">
  <table id="API_table_degradation2" cellspacing="0" cellpadding="4">
    <tbody>
      <tr>
          <th class="api2 tableHeader4"> <span class="firstSpan">API (ID)<span class="secondSpan">Explanation1</span></span> </th>
          <th class="api2 tableHeader4"> <span class="firstSpan">Removal fraction activated carbon<span class="secondSpan">Explanation3</span></span> </th>
          <th class="api2 tableHeader4"> <span class="firstSpan">Removal fraction ozone<span class="secondSpan">Explanation4</span></span> </th>
          <th class="api2 tableHeader4"> <span class="firstSpan">Removal fraction UV<span class="secondSpan">Explanation5</span></span> </th>
      </tr>
      <tr>
        <td><input style="width: 120px;" class="tableField4" type="text" id="degr_col1" value="Ibuprofen" readonly /></td>
        <td><input style="width: 280px;" class="tableField4" type="text" id="degr_col1" value="0.0" readonly /></td>
        <td><input style="width: 280px;" class="tableField4" type="text" id="degr_col1" value="0.0" readonly /></td>
        <td><input style="width: 280px;" class="tableField4" type="text" id="degr_col1" value="0.0" readonly /></td>
      </tr>
    </tbody>
  </table>
  </form>
  </div>

</div>

<div id="Consumption" class="tabcontent">
  <h4>Consumption data</h4>
  <!-- <p>The consumption data required to run ePiE is based on the selected river basin. Each rows below are dynamically created based on the WWTPs present in the selected river basin.</p> -->
  <!-- <p>In this tab, country-specific consumption data needs to be entered for selected APIs. 
    For which countries consumption data is required depends on the previously selected river basins. 
    If a river basin is distributed over several countries, annual consumption data is required for each of these countries. 
  </p> -->
  <p style="max-width: 1250px;">
    <!-- From the drop-down menu below, the prefered method of entering the consumption data can be selected. 
    The first option uses an overall average per capita consumption value per API to compute the consumption for each country based on the population in a specific year.
    The second and third option will require country-specific consumption data for each API (either the total consumption in kg/year or the per capita consumption g/year/capita). -->
    By clicking the button 'Generate table', a table will be created below based on the selected river basins and their respective countries. 
    The average per capita consumption values (g/capita/year) can be entered at the top, which will automatically populate the country-specific total consumption values (kg/year) 
    based on the population in a specific year (default is 2024).
    <!-- , can be changed after generating the table from the drop-down menu).  -->
    <!-- If you have country-specific consumption data, you can simply overwrite the generated values in the table below (kg/year). -->
  </p>

  <h4>Instructions:</h4>
  <ol style="max-width: 800px;">
    <li>Click "Generate table" to create the table with required consumption data.</li>
    <li>Fill the per capity yearly consumption (g/capita/year) in the first table (by clicking the "Edit table" button).</li>
    <li>Select the year for the country-specific populaton numbers.</li>
    <li>(optionally) Overwrite the country-specific consumption values (in kg/year).</li>
  </ol>

  <!--
  <form style="margin-top: -5px;">
    <label for="cons_data_type">Select consumption data type: </label>
    <select @change="selectConsDataType()" name="cons_data_type" id="cons_data_type" selected="select from drop-down menu">
      <option value="euavg_percapitygram">Overall average per capita consumption (g/year)</option>
      <option value="country_totalkgyear">Country-specific total yearly consumption (kg/year)</option>
      <option value="country_percapitagram">Country-specific per capita consumption (g/year)</option>
    </select>
  </form>
  -->
  <div style="display: none;" id="cons_data_type_value_holder">euavg_percapitygram</div>

  <div style="height: 15px;"></div>

  <button id="gen_cons_table_btn" class="action_button" type="button" style="margin-bottom: 0rem;" 
          @click="run_generateConsumptionTableWrapper()">Generate table</button>

  <div id="cons_edit_buttons" style="display: none;">
    <button type="button" class="action_button" id="edit" @click="editTabValues()">Edit table</button>
    <button type="button" class="action_button" id="save5" @click="saveTabValues()">Save table</button>
    <!-- <button class="action_button" type="button" style="margin-bottom: 0rem;" @click="notYetDeveloped()">Get Excel template</button> -->
    <!-- <button class="action_button" type="button" style="margin-bottom: 0rem;" @click="notYetDeveloped()">Read Excel data</button> -->
  </div>
  
  <form class="API_table_form" id="avg_per_capita_cons_table" style="max-width: 800px;">
  <table id="API_table_consumption_avg_per_capita" cellspacing="0" cellpadding="4">
    <tbody>
    </tbody>
  </table>
  </form>

  <div id="progress_gen_table_cons">Generating consumption table, please wait...</div>

  <div id="div_container_pop_year">
    <form style="margin-top: 0px;">
      <label for="pop_year">Select population year</label>
      <select @change="setPopulationYear()" name="pop_year" id="pop_year" selected="select from drop-down menu">
        <option value=2024>2024</option>
        <option value=2023>2023</option>
        <option value=2022>2022</option>
        <option value=2021>2021</option>
        <option value=2020>2020</option>
        <option value=2019>2019</option>
        <option value=2018>2018</option>
        <option value=2017>2017</option>
        <option value=2016>2016</option>
        <option value=2015>2015</option>
        <option value=2014>2014</option>
      </select>
    </form>
    <div style="display: none;" id="pop_year_value_holder">2024</div>
  </div>
  
  <form class="API_table_form" style="max-width: 800px;">
  <table id="API_table_consumption" cellspacing="0" cellpadding="4">
    <tbody>
    </tbody>
  </table>
  </form>

  <p id="consHeaderHoverInfo">Please hover over the table headers to get an explanation of each parameter as well as the required unit.</p>

</div>


<div id="Run_process" class="tabcontent">
  <h3>Run ePiE</h3>
  <p style="max-width: 1250px;">After parameterisation the ePiE model can be run. Additionally, the current workspace (all settings stored in the previous tabs) can be exported for future runs.</p>
  <button class="action_button" type="button" style="margin-bottom: 0rem;" @click="notYetDeveloped()">Store current workspace</button>
  <button class="action_button" type="button" style="margin-bottom: 2rem;" @click="notYetDeveloped()">Load previous workspace</button>
  <div style="height: 0px;"></div>
  <hr> <!-- --------------------------------------------- -->
  <div style="height: 10px;"></div>
  <button id="run_epie_btn" class="action_button" type="button" style="margin-bottom: 1rem;" @click="runEPIEWrapper()">Run ePiE</button>
  <p id="cmd_path" class="debugging">paths</p>
  <p id="cmd_out_title" style="margin-bottom: 0.1rem;">Progress:</p>
  <div id="cmd_out"></div>
  <div id="myProgress">
    <div id="myBar"></div>
  </div>
</div>

<div id="Map_results" class="tabcontent">
  <h4>Map Results</h4>
  <p style="max-width: 1150px;">
    <!-- Here the estimated river concentrations can visualized spatially on a map. Please select the API for which you want to generate the map from the drop-down menu and click the button 'Generate map'. -->
    Here the estimated river concentrations can visualized spatially on a map, click the button 'Generate map' to visualize the results.
    Additionally, the spatial data can be exported as GeoJSON file and the full output data (including non-spatial data) can be exported as Excel file.
  </p>
  <label style="margin-right: 4px;" for="API_map_selection">Select API to create map for: </label>
  <select name="API_map_selection" id="API_map_selection">
    <option value="API1">No results yet</option>
    <!-- <option value="API1">Ibuprofen3</option>
    <option value="API1">Ibuprofen4</option> -->
  </select>
  <!-- <p>tabcontent.</p> -->
  <button class="action_button" style="margin-left: 10px;" type="button" @click="createOutputMapWrapper()">Generate map</button>
  <div id="osm_map"></div>
  <div id="mapholder">
    <div id="map"></div>
  </div>
  <button class="action_button" style="margin-left: 10px;" type="button" @click="exportSpatialGEOJSONWrapper()">Export spatial data</button>
  <button class="action_button" id="ExcelExportBtnConc" style="margin-left: 10px;" type="button" @click="exportFullOutputExcelWrapper()">Export full data as Excel</button>
</div>

<div id="PNEC_Map_results" class="tabcontent">
  <h4>Map Risks</h4>
  <p style="max-width: 1250px;">
    Here the risks are mapped spatially by comparing the estimated river concentrations against a risk threshold. 
    Please set the risk threshold you want to compare the concentrations against 
    and click the button 'Generate map'.
  </p>
  <label style="margin-right: 4px;" for="API_map_selection">Select API to create map for: </label>
  <select name="API_map_selection" id="API_map_selection">
    <option value="API1">No results yet</option>
    <!-- <option value="API1">Ibuprofen3</option>
    <option value="API1">Ibuprofen4</option> -->
  </select>
  <!-- <p>tabcontent.</p> -->
  <label style="width: 10px;"> </label>
  <label style="margin-right: 4px;" for="API_map_selection">Risk threshold value: </label>
  <input style="width: 150px;" class="riskvalclass" type="text" id="riskval" value="0.01"/>
  <label style="margin-right: 4px;" for="API_map_selection">ug/L </label>
  <button class="action_button" style="margin-left: 10px;" type="button" @click="createPNECOutputMapWrapper()">Generate map</button>
  <div id="osm_map"></div>
  <div id="pnec_mapholder">
    <div id="pnec_map"></div>
  </div>
  <!-- <button class="action_button" style="margin-left: 10px;" type="button" @click="exportSpatialGEOJSONWrapper()">Export spatial data</button>
  <button class="action_button" style="margin-left: 10px;" type="button" @click="exportFullOutputExcelWrapper()">Export full data as Excel</button> -->
</div>


<div id="Basin_result_stats" class="tabcontent">
  <h4>Output Statistics</h4>
  <p>
    Here the estimated river concentrations can summerized. Click the button 'Calculate statistics' to populate the table. 
  </p>
  <label style="margin-right: 4px;" for="API_map_selection">Calculate statistics for: </label>
  <select name="API_map_selection" id="API_map_selection">
    <option value="API1">No results yet</option>
    <!-- <option value="API1">Ibuprofen3</option>
    <option value="API1">Ibuprofen4</option> -->
  </select>
  <!-- <p>tabcontent.</p> -->
  <button class="action_button" style="margin-left: 10px;" type="button" @click="CalculateBasinStatisticsWrapper()">Calculate statistics</button>

  <div>
  <form class="API_table_form" style="max-width: 1150px;">
  <table id="API_table_basinStats" cellspacing="0" cellpadding="4">
    <tbody>
      <tr>
          <th style="width: 150px;" class="basinStats tableHeaderStats"> <span class="firstSpan">API<br>(ID)<br><span class="secondSpan">Explanation1</span></span> </th>
          <th style="width: 150px;" class="basinStats tableHeaderStats"> <span class="firstSpan">Basin<br>(ID)<br><span class="secondSpan">Explanation1</span></span> </th>
          <th style="width: 150px;" class="basinStats tableHeaderStats"> <span class="firstSpan">Mean ug/L<br>(all)<br><span class="secondSpan">Explanation3</span></span> </th>
          <th style="width: 150px;" class="basinStats tableHeaderStats"> <span class="firstSpan">Median ug/L<br>(all)<br><span class="secondSpan">Explanation4</span></span> </th>
          <th style="width: 200px;" class="basinStats tableHeaderStats"> <span class="firstSpan">Mean ug/L<br>(downstream WWTP)<br><span class="secondSpan">Explanation5</span></span> </th>
          <th style="width: 200px;" class="basinStats tableHeaderStats"> <span class="firstSpan">Median ug/L<br>(downstream WWTP)<br><span class="secondSpan">Explanation6</span></span> </th>
      </tr>
      <tr>
        <td><input style="width: 150px;" class="tableHeaderStats" type="text" id="statcol" value="" readonly /></td>
        <td><input style="width: 150px;" class="tableHeaderStats" type="text" id="statcol" value="" readonly /></td>
        <td><input style="width: 150px;" class="tableHeaderStats" type="text" id="statcol" value="" readonly /></td>
        <td><input style="width: 150px;" class="tableHeaderStats" type="text" id="statcol" value="" readonly /></td>
        <td><input style="width: 200px;" class="tableHeaderStats" type="text" id="statcol" value="" readonly /></td>
        <td><input style="width: 200px;" class="tableHeaderStats" type="text" id="statcol" value="" readonly /></td>
      </tr>
    </tbody>
  </table>
  </form>
  </div>

  <div style="height: 45px;"></div>
  <!-- <button class="action_button" style="margin-left: 10px;" type="button" @click="xxx()">Export statistics</button> -->
</div>

</template>

