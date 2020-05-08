//modified from http://crc32.nichabi.com/javascript-function.php
let crcObj = {
  arr: [],
  fillArr: function(){
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        this.arr.push(c);
    }
  },
  calcCRC32: function(str, len){
    if(!this.arr.length) this.fillArr(); //populate polinomials array if empty

    let crc = -1; //Just a start value

    for (let i = 0; i < len; i++)
        crc = (crc >>> 8) ^ this.arr[(crc ^ str.charCodeAt(i)) & 0xff];

    crc = crc ^ (-1);
    return (crc >>> 0).toString(16); //CRC in hexadecimal form
  }
}
//modified from http://crc32.nichabi.com/javascript-function.php

let dataObj = {
  lineData: [], //Array of objects {line, crc} <--- one string paired with a CRC32 of this strings

  getData: function (str){
    str = str.match(/.{1,32}/g); // <-- Block size = 32 ---- divides whole file into array of 32 char long stringsOpt

    //Fill obj and calculate CRC32 for indivdual strings
    str.forEach(function(entry){
      dataObj.lineData.push({line: entry, crc: crcObj.calcCRC32(entry, entry.length)});
      //console.log(crcObj.calcCRC32(entry, entry.length));
      //console.log(entry);
    });
    //console.log(this.lineData);
    this.writeFile();
  },
  writeFile: function(){
    //----------Prepare data to make file--------------
    let content = "";

    //----------Get file extension---------
    let extensionData = {
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
  	let blob = new Blob([content],{type: extensionData.type()});

  	//--Download the file:
  	download(blob,"crc." + extensionData.ext); //file name and extension

  	function download(blob,name) {
  		let url = URL.createObjectURL(blob),
  		div = document.createElement("div"),
  		anch = document.createElement("a");

  		document.body.appendChild(div);
  		div.appendChild(anch);

  		anch.innerHTML = "&nbsp;";
  		div.style.width = "0";
  		div.style.height = "0";
  		anch.href = url;
  		anch.download = name;

  		var ev = new MouseEvent("click",{});
  		anch.dispatchEvent(ev);
  		document.body.removeChild(div);
  	}
  }

}

//----------------DOM elements for displaying checked data--------------------
let addToDom = {
  it: 0,
  addElem: function(x){
      let parent = $(x.target);
      let cl = (x.cl != null ? ' class="' + x.cl + '"': " ");
      let extra = (x.extra != null ? x.extra : "");
      let text = (x.text != null ? x.text : "");
      let id = (x.id != null ? ' id = "' + x.id + '"' : " ");

      parent.append("<" + x.sel + id + cl +" "+ extra +">"+ text +"</"+ x.sel +">");
  },
  getInfo: function(x){
    if(this.addLog(x.crcCheck, x.crcOrg, x.line))
      this.addFile(x.line);
    else {
      this.addFile("\n!INVALID CRC IN GIVEN LINE!\n");
    }
  },
  addLog: function(crcC, crcO, line){
    let stat = (crcC === crcO ? "OK" : "INVALID");
    //...add to log

    let row = {
      sel: 'p',
      cl: 'logRow',
      target: '#log',
      id: 'lr' + this.it
    }
    addToDom.addElem(row);

    let add = {
      sel: 'p',
      target: '#' + row.id,
      cl: 'logLine',
      text: 'Checked line: ' + line
    }

    let crcCheck = {
      sel: 'p',
      target: add.target,
      cl: 'logCrc',
      text: "Given CRC: " + crcO.toUpperCase() + "\t Calculated CRC: " + crcC.toUpperCase()
    }

    let st = {
      sel: 'p',
      target: add.target,
      cl: stat,
      text: "Status: " + stat
    }

    $("#" + row.id).ready(function(){
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
  document.getElementById('inputfile').onchange = function (evt) {
    var f = evt.target.files[0];

    //Sanity check
    if (f){
      var r = new FileReader();

      r.onload = function(e) {
        var contents = e.target.result;

        let ctrlPoint = 0;
        //dataObj.getData(contents.substr(0, contents.length).replace(/\r?\n|\r/g, ' '));
        dataObj.getData(contents.substr(0, contents.length).replace(/\r?\n|\r/g,"\\n"));
      }

      r.readAsText(f);

      } else {
        alert("No file uploaded");
      }
  }

  //CRC check
  document.getElementById('checkfile').onchange = function (evt) {
    var f = evt.target.files[0];

    //Sanity check
    if(f){
      var r = new FileReader();

      r.onload = function(e) {
        var contents = e.target.result;

        //Check if file extension is correct
        if(f.type == "text/plain"){
          let txt = contents.split('\n').map(function(ln){
            return ln.split('\t');
          });

          //Loop through text file
          txt.forEach(function(entry){
            //...check CRC
            let crcChk = crcObj.calcCRC32(entry[1], entry[1].length);
            addToDom.getInfo({crcCheck: crcChk, crcOrg: entry[0], line: entry[1]})

          });
        }
        else if (f.type == "application/json") {
          let data = JSON.parse(contents);

          //Loop through JSON
          for(let i = 0; i < data.length; i++){
            //...check CRC
            if(data[i].crc === crcObj.calcCRC32(data[i].line, data[i].line.length)){
              //...display line & CRC ok status
              console.log("Line: " + data[i].line + "\tStatus: OK");
            }
            else{
              //...display line & CRC fail status
              console.log("Line: " + data[i].line + "\tStatus: ERROR\nCRC: " + data[i].crc + "\tcalculated: " + crcObj.calcCRC32(data[i].line, data[i].line.length));
            }
          }
        }
        //Unrecognized file extension
        else
          alert("Sorry, this file is invalid, allowed extensions are: .txt .json");
      }

      r.readAsText(f);

      } else {
        alert("No file uploaded");
      }
  }

});
