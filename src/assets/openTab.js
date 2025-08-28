import copyOverAPI_ID from './copyOverAPI_ID.js';

export default function openTab(evt, tabName) {
  
  console.log(evt)
  console.log(tabName)
  console.log(evt.currentTarget)
  
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) tabcontent[i].style.display = "none";
  
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) tablinks[i].className = tablinks[i].className.replace(" active", "");
  
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active";

  if(tabName=="API_properties") copyOverAPI_ID();
  
}

