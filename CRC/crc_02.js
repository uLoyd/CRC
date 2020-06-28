//modified from http://crc32.nichabi.com/javascript-function.php
let crcObj = {
  arr: [],
  fillArr: function(){
    for (let i = 0; i < 256; i++) {
        for (let j = 0; j < 8; j++) {
            this.arr.push((i & 1) ? (0xedb88320 ^ (i >>> 1)) : (i >>> 1));
        }
    }
  },
  calcCRC32: function(str, len){
    if(!this.arr.length) this.fillArr(); //populate polinomials array if empty
    let crc = -1;                        //Just a start value

    for (let i = 0; i < len; i++)
        crc = (crc >>> 8) ^ this.arr[(crc ^ str.charCodeAt(i)) & 0xff];

    return ((crc ^ (-1)) >>> 0).toString(16);     //CRC in hexadecimal form
  }
}
//modified from http://crc32.nichabi.com/javascript-function.php

let readFile = (source, callback) => {
  document.getElementById(source).onchange = (evt) => {
    const file = evt.target.files[0];

    if(file){
      const read = new FileReader();

      read.onload = (content) => {
        callback(content.target.result, file.type);
      }
      read.onerror = () => {
        console.log(read.error);
        callback(false);
      };
      read.readAsText(file);
    }
    else{
      callback(false);
    }
  }
}

let dataObj = {
  lineData: [],                  //Array of objects {line, crc} <--- one string paired with a CRC32 of this strings
  getData: function (str){
    str = str.match(/.{1,32}/g); // <-- Block size = 32 ---- divides whole file into array of 32 char long stringsOpt

    //Fill obj and calculate CRC32 for indivdual strings
    str.forEach(function(entry){
      dataObj.lineData.push({line: entry, crc: crcObj.calcCRC32(entry, entry.length)});
    });

    this.writeFile();
  },
  writeFile: function(){
    //----------Prepare data to make file--------------
    let content = "";

    //----------Get file extension---------
    const extensionData = {
      ext: null,
      type: function(){
        return (ext == "txt" ? "text/plain" : "application/json");
      },
      getExt: function(){
        let e = document.getElementById("ext");
        this.ext = e.options[e.selectedIndex].value;
      },
      prepareData: function(data){
        //Sanity check
        if(ext){
          //Prepare data for .txt file
          if(this.ext === "txt"){
            data.forEach(function(entry){
              content += entry.crc + "\t" + entry.line + "\n";
              console.log(entry.crc + "\t" + entry.line + "\n");
            });
            //content.replace(/\n$/, ""); //Deletes last newline
            content = content.substr(0, content.length - 1); //Deletes last newline
          }
          //Prepare data for .json file
          else{
            content = JSON.stringify(data);
          }
        }
        else alert("Error while preparing file");
      }
    }

    extensionData.getExt();
    extensionData.prepareData(this.lineData);
    //----------Get file extension---------

    //----------Prepare data to make file--------------

    //--Create the text file as a Blob:
  	const blob = new Blob([content],{type: extensionData.type()});

  	//--Download the file:
  	download(blob, `crc.${extensionData.ext}`); //file name and extension

  	function download(blob,name) {
      //--Download the file:
      let anch = document.createElement("a");
      anch.href = URL.createObjectURL(blob);
      anch.download = name;

      //----Trigger download and clean up:
      const ev = new MouseEvent("click",{});
      anch.dispatchEvent(ev);
  	}
  }
}

//----------------DOM elements for displaying checked data--------------------
let addToDom = {
  it: 0,
  addElem: function(x){
      const parent = $(x.target),
      cl = (x.cl != null ?  `class="${x.cl}"`: ""),
      extra = (x.extra != null ? x.extra : ""),
      text = (x.text != null ? x.text : ""),
      id = (x.id != null ? `id="${x.id}"` : "");

      parent.append(`<${x.sel} ${id} ${cl} ${extra}>${text}</${x.sel}>`);
  },
  getInfo: function(x){
    if(this.addLog(x.crcCheck, x.crcOrg, x.line))
      this.addFile(x.line);
    else
      this.addFile("\n!INVALID CRC IN GIVEN LINE!\n");
  },
  addLog: function(crcC, crcO, line){
    function DOMobject(sel, tar, cl, txt) {
      this.sel = sel;
      this.target = tar;
      this.cl = cl;
      this.text = txt;
    }
    const stat = (crcC === crcO ? "OK" : "INVALID");

    const row = new DOMobject('p', '#log', 'logRow', null);
    row.id = `lr${this.it}`;
    addToDom.addElem(row);

    const add      = new DOMobject('p', `#${row.id}`, 'logLine', `Checked line: ${line}`);
    const crcCheck = new DOMobject('p', add.target, 'logCrc', `Given CRC: ${crcO.toUpperCase()}\nCalculated CRC: ${crcC.toUpperCase()}`);
    const st       = new DOMobject('p', add.target, stat, `Status: ${stat}`);

    $(`#${row.id}`).ready(function(){
      addToDom.addElem(add);
      addToDom.addElem(crcCheck);
      addToDom.addElem(st);
    });

    return (stat === "OK" ? 1 : 0);
  },
  addFile: function(x){
    x = x.replace("\\n", "\n");
    //...add to dom
    $("#txt").text($("#txt").text() + x);
  }
}
//----------------DOM elements for displaying checked data--------------------

$(document).ready(function(){
  //File upload to calculate CRC
  readFile('inputfile', (data) => {
    if(data)
      dataObj.getData(data.substr(0, data.length).replace(/\r?\n|\r/g,"\\n"));

    else
      console.log('No file uploaded');
  });

  //CRC check
  readFile('checkfile', (recData, type) => {
    if(recData){
      //Check if file extension is correct
      if(type == "text/plain"){
        let txt = recData.split('\n').map(function(ln){
          return ln.split('\t');
        });

        //Loop through text file
        txt.forEach(function(entry){
          //...check CRC
          const crcChk = crcObj.calcCRC32(entry[1], entry[1].length);
          addToDom.getInfo({crcCheck: crcChk, crcOrg: entry[0], line: entry[1]})
        });
      }
      else if (type == "application/json") {
        const data = JSON.parse(recData);

        //Loop through JSON
        for(let i = 0; i < data.length; i++){
          //...check CRC
          if(data[i].crc === crcObj.calcCRC32(data[i].line, data[i].line.length)){
            //...display line & CRC ok status
            console.log(`Line: ${data[i].line}\tStatus: OK`);
          }
          else{
            //...display line & CRC fail status
            console.log(`Line: ${data[i].line}\tStatus: ERROR\nCRC: ${data[i].crc}\tcalculated: ${crcObj.calcCRC32(data[i].line, data[i].line.length)}`);
          }
        }
      }
      //Unrecognized file extension
      else
        alert("Sorry, this file is invalid, allowed extensions are: .txt .json");
    }

    else
      console.log('No file uploaded');
  });

});
