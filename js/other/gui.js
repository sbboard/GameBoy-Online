var inFullscreen = false;
var mainCanvas = null;
var fullscreenCanvas = null;
var showAsMinimal = false;
var keyZones = [
  ["right", [39]],
  ["left", [37]],
  ["up", [38]],
  ["down", [40]],
  ["a", [88, 74]],
  ["b", [90, 81, 89]],
  ["select", [16]],
  ["start", [13]],
];
function windowingInitialize() {
  mainCanvas = document.getElementById("mainCanvas");
  fullscreenCanvas = document.getElementById("fullscreen");
  registerGUIEvents();
  document.getElementById("enable_sound").checked = settings[0];

  async function createFile() {
    const rom = "mole.gb";
    let response = await fetch(`/testRoms/${rom}`);
    let data = await response.blob();
    let file = new File([data], `rom.${rom.split(".")[1]}`);
    openFile(file);
  }
  createFile();
}
function registerGUIEvents() {
  cout("In registerGUIEvents() : Registering GUI Events.", -1);
  addEvent(
    "click",
    document.getElementById("local_storage_list_refresh_button"),
    refreshStorageListing
  );
  addEvent("keydown", document, keyDown);
  addEvent("keyup", document, function (event) {
    keyUp(event);
  });
  addEvent("MozOrientation", window, GameBoyGyroSignalHandler);
  addEvent("deviceorientation", window, GameBoyGyroSignalHandler);
  addEvent("click", document.getElementById("data_uri_clicker"), function () {
    var datauri = prompt(
      "Please input the ROM image's Base 64 Encoded Text:",
      ""
    );
    if (datauri != null && datauri.length > 0) {
      try {
        cout(
          Math.floor((datauri.length * 3) / 4) +
            " bytes of data submitted by form (text length of " +
            datauri.length +
            ").",
          0
        );
        start(mainCanvas, base64_decode(datauri));
      } catch (error) {
        alert(
          error.message +
            " file: " +
            error.fileName +
            " line: " +
            error.lineNumber
        );
      }
    }
  });
  addEvent("click", document.getElementById("set_volume"), function () {
    if (GameBoyEmulatorInitialized()) {
      var volume = prompt("Set the volume here:", "1.0");
      if (volume != null && volume.length > 0) {
        settings[3] = Math.min(Math.max(parseFloat(volume), 0), 1);
        gameboy.changeVolume();
      }
    }
  });
  addEvent("click", document.getElementById("set_speed"), function () {
    if (GameBoyEmulatorInitialized()) {
      var speed = prompt("Set the emulator speed here:", "1.0");
      if (speed != null && speed.length > 0) {
        gameboy.setSpeed(Math.max(parseFloat(speed), 0.001));
      }
    }
  });
  addEvent(
    "click",
    document.getElementById("internal_file_clicker"),
    function () {
      var file_opener = document.getElementById("local_file_open");
      file_opener.click();
    }
  );
  addEvent("change", document.getElementById("save_open"), function () {
    if (typeof this.files != "undefined") {
      try {
        if (this.files.length >= 1) {
          cout(
            'Reading the local file "' +
              this.files[0].name +
              '" for importing.',
            0
          );
          try {
            //Gecko 1.9.2+ (Standard Method)
            var binaryHandle = new FileReader();
            binaryHandle.onload = function () {
              if (this.readyState == 2) {
                cout("file imported.", 0);
                try {
                  import_save(this.result);
                  refreshStorageListing();
                } catch (error) {
                  alert(
                    error.message +
                      " file: " +
                      error.fileName +
                      " line: " +
                      error.lineNumber
                  );
                }
              } else {
                cout("importing file, please wait...", 0);
              }
            };
            binaryHandle.readAsBinaryString(this.files[this.files.length - 1]);
          } catch (error) {
            cout(
              "Browser does not support the FileReader object, falling back to the non-standard File object access,",
              2
            );
            //Gecko 1.9.0, 1.9.1 (Non-Standard Method)
            var romImageString =
              this.files[this.files.length - 1].getAsBinary();
            try {
              import_save(romImageString);
              refreshStorageListing();
            } catch (error) {
              alert(
                error.message +
                  " file: " +
                  error.fileName +
                  " line: " +
                  error.lineNumber
              );
            }
          }
        } else {
          cout("Incorrect number of files selected for local loading.", 1);
        }
      } catch (error) {
        cout("Could not load in a locally stored ROM file.", 2);
      }
    } else {
      cout("could not find the handle on the file to open.", 2);
    }
  });
  addEvent(
    "click",
    document.getElementById("restart_cpu_clicker"),
    function () {
      if (GameBoyEmulatorInitialized()) {
        try {
          if (!gameboy.fromSaveState) {
            start(mainCanvas, gameboy.getROMImage());
          } else {
            openState(gameboy.savedStateFileName, mainCanvas);
          }
        } catch (error) {
          alert(
            error.message +
              " file: " +
              error.fileName +
              " line: " +
              error.lineNumber
          );
        }
      } else {
        cout(
          "Could not restart, as a previous emulation session could not be found.",
          1
        );
      }
    }
  );
  addEvent("click", document.getElementById("run_cpu_clicker"), function () {
    run();
  });
  addEvent("click", document.getElementById("kill_cpu_clicker"), function () {
    pause();
  });
  addEvent("click", document.getElementById("save_state_clicker"), function () {
    save();
  });
  addEvent(
    "click",
    document.getElementById("save_SRAM_state_clicker"),
    function () {
      saveSRAM();
    }
  );
  addEvent("click", document.getElementById("enable_sound"), function () {
    settings[0] = document.getElementById("enable_sound").checked;
    if (GameBoyEmulatorInitialized()) {
      gameboy.initSound();
    }
  });
  addEvent("click", document.getElementById("disable_colors"), function () {
    settings[2] = document.getElementById("disable_colors").checked;
  });
  addEvent("click", document.getElementById("rom_only_override"), function () {
    settings[9] = document.getElementById("rom_only_override").checked;
  });
  addEvent(
    "click",
    document.getElementById("mbc_enable_override"),
    function () {
      settings[10] = document.getElementById("mbc_enable_override").checked;
    }
  );
  addEvent(
    "click",
    document.getElementById("enable_colorization"),
    function () {
      settings[4] = document.getElementById("enable_colorization").checked;
    }
  );
  addEvent("click", document.getElementById("do_minimal"), function () {
    showAsMinimal = document.getElementById("do_minimal").checked;
    fullscreenCanvas.className = showAsMinimal ? "minimum" : "maximum";
  });
  addEvent("click", document.getElementById("software_resizing"), function () {
    settings[12] = document.getElementById("software_resizing").checked;
    if (GameBoyEmulatorInitialized()) {
      gameboy.initLCD();
    }
  });
  addEvent(
    "click",
    document.getElementById("typed_arrays_disallow"),
    function () {
      settings[5] = document.getElementById("typed_arrays_disallow").checked;
    }
  );
  addEvent(
    "click",
    document.getElementById("gb_boot_rom_utilized"),
    function () {
      settings[11] = document.getElementById("gb_boot_rom_utilized").checked;
    }
  );
  addEvent("click", document.getElementById("resize_smoothing"), function () {
    settings[13] = document.getElementById("resize_smoothing").checked;
    if (GameBoyEmulatorInitialized()) {
      gameboy.initLCD();
    }
  });
  addEvent("click", document.getElementById("channel1"), function () {
    settings[14][0] = document.getElementById("channel1").checked;
  });
  addEvent("click", document.getElementById("channel2"), function () {
    settings[14][1] = document.getElementById("channel2").checked;
  });
  addEvent("click", document.getElementById("channel3"), function () {
    settings[14][2] = document.getElementById("channel3").checked;
  });
  addEvent("click", document.getElementById("channel4"), function () {
    settings[14][3] = document.getElementById("channel4").checked;
  });
  addEvent("mouseup", document.getElementById("gfx"), initNewCanvasSize);
  addEvent("resize", window, initNewCanvasSize);
  addEvent("unload", window, function () {
    autoSave();
  });
}

function openFile(file) {
  if (typeof file != "undefined") {
    try {
      if (file) {
        cout('Reading the local file "' + file.name + '"', 0);
        try {
          //Gecko 1.9.2+ (Standard Method)
          var binaryHandle = new FileReader();
          binaryHandle.onload = function () {
            if (this.readyState == 2) {
              cout("file loaded.", 0);
              try {
                start(mainCanvas, this.result);
              } catch (error) {
                alert(
                  error.message +
                    " file: " +
                    error.fileName +
                    " line: " +
                    error.lineNumber
                );
              }
            } else {
              cout("loading file, please wait...", 0);
            }
          };
          binaryHandle.readAsBinaryString(file);
        } catch (error) {
          cout(
            "Browser does not support the FileReader object, falling back to the non-standard File object access,",
            2
          );
          //Gecko 1.9.0, 1.9.1 (Non-Standard Method)
          var romImageString = file.getAsBinary();
          try {
            start(mainCanvas, romImageString);
          } catch (error) {
            alert(
              error.message +
                " file: " +
                error.fileName +
                " line: " +
                error.lineNumber
            );
          }
        }
      } else {
        cout("Incorrect number of files selected for local loading.", 1);
      }
    } catch (error) {
      cout("Could not load in a locally stored ROM file.", 2);
    }
  } else {
    cout("could not find the handle on the file to open.", 2);
  }
}

function keyDown(event) {
  var keyCode = event.keyCode;
  var keyMapLength = keyZones.length;
  for (var keyMapIndex = 0; keyMapIndex < keyMapLength; ++keyMapIndex) {
    var keyCheck = keyZones[keyMapIndex];
    var keysMapped = keyCheck[1];
    var keysTotal = keysMapped.length;
    for (var index = 0; index < keysTotal; ++index) {
      if (keysMapped[index] == keyCode) {
        GameBoyKeyDown(keyCheck[0]);
        try {
          event.preventDefault();
        } catch (error) {}
      }
    }
  }
}
function keyUp(event) {
  var keyCode = event.keyCode;
  var keyMapLength = keyZones.length;
  for (var keyMapIndex = 0; keyMapIndex < keyMapLength; ++keyMapIndex) {
    var keyCheck = keyZones[keyMapIndex];
    var keysMapped = keyCheck[1];
    var keysTotal = keysMapped.length;
    for (var index = 0; index < keysTotal; ++index) {
      if (keysMapped[index] == keyCode) {
        GameBoyKeyUp(keyCheck[0]);
        try {
          event.preventDefault();
        } catch (error) {}
      }
    }
  }
}
function runFreeze(keyName) {
  try {
    openState(keyName, mainCanvas);
  } catch (error) {
    cout(
      "A problem with attempting to open the selected save state occurred.",
      2
    );
  }
}
//Wrapper for localStorage getItem, so that data can be retrieved in various types.
function findValue(key) {
  try {
    if (window.localStorage.getItem(key) != null) {
      return JSON.parse(window.localStorage.getItem(key));
    }
  } catch (error) {
    //An older Gecko 1.8.1/1.9.0 method of storage (Deprecated due to the obvious security hole):
    if (window.globalStorage[location.hostname].getItem(key) != null) {
      return JSON.parse(window.globalStorage[location.hostname].getItem(key));
    }
  }
  return null;
}
//Wrapper for localStorage setItem, so that data can be set in various types.
function setValue(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    //An older Gecko 1.8.1/1.9.0 method of storage (Deprecated due to the obvious security hole):
    window.globalStorage[location.hostname].setItem(key, JSON.stringify(value));
  }
}
//Wrapper for localStorage removeItem, so that data can be set in various types.
function deleteValue(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    //An older Gecko 1.8.1/1.9.0 method of storage (Deprecated due to the obvious security hole):
    window.globalStorage[location.hostname].removeItem(key);
  }
}
function outputLocalStorageLink(keyName, dataFound, downloadName) {
  return generateDownloadLink(
    "data:application/octet-stream;base64," + dataFound,
    keyName,
    downloadName
  );
}
function refreshFreezeListing() {
  var storageListMasterDivSub = document.getElementById(
    "freezeListingMasterContainerSub"
  );
  var storageListMasterDiv = document.getElementById(
    "freezeListingMasterContainer"
  );
  storageListMasterDiv.removeChild(storageListMasterDivSub);
  storageListMasterDivSub = document.createElement("div");
  storageListMasterDivSub.id = "freezeListingMasterContainerSub";
  var keys = getLocalStorageKeys();
  while (keys.length > 0) {
    key = keys.shift();
    if (key.substring(0, 7) == "FREEZE_") {
      storageListMasterDivSub.appendChild(outputFreezeStateRequestLink(key));
    }
  }
  storageListMasterDiv.appendChild(storageListMasterDivSub);
}
function outputFreezeStateRequestLink(keyName) {
  var linkNode = generateLink(
    'javascript:runFreeze("' + keyName + '")',
    keyName
  );
  var storageContainerDiv = document.createElement("div");
  storageContainerDiv.className = "storageListingContainer";
  storageContainerDiv.appendChild(linkNode);
  return storageContainerDiv;
}
function refreshStorageListing() {
  var storageListMasterDivSub = document.getElementById(
    "storageListingMasterContainerSub"
  );
  var storageListMasterDiv = document.getElementById(
    "storageListingMasterContainer"
  );
  storageListMasterDiv.removeChild(storageListMasterDivSub);
  storageListMasterDivSub = document.createElement("div");
  storageListMasterDivSub.id = "storageListingMasterContainerSub";
  var keys = getLocalStorageKeys();
  var blobPairs = [];
  for (var index = 0; index < keys.length; ++index) {
    blobPairs[index] = getBlobPreEncoded(keys[index]);
    storageListMasterDivSub.appendChild(
      outputLocalStorageRequestLink(keys[index])
    );
  }
  storageListMasterDiv.appendChild(storageListMasterDivSub);
  var linkToManipulate = document.getElementById("download_local_storage_dba");
  linkToManipulate.href =
    "data:application/octet-stream;base64," +
    base64(generateMultiBlob(blobPairs));
  linkToManipulate.download = "gameboy_color_saves.export";
}
function getBlobPreEncoded(keyName) {
  if (keyName.substring(0, 9) == "B64_SRAM_") {
    return [keyName.substring(4), base64_decode(findValue(keyName))];
  } else if (keyName.substring(0, 5) == "SRAM_") {
    return [keyName, convertToBinary(findValue(keyName))];
  } else {
    return [keyName, JSON.stringify(findValue(keyName))];
  }
}
function outputLocalStorageRequestLink(keyName) {
  var linkNode = generateLink(
    'javascript:popupStorageDialog("' + keyName + '")',
    keyName
  );
  var storageContainerDiv = document.createElement("div");
  storageContainerDiv.className = "storageListingContainer";
  storageContainerDiv.appendChild(linkNode);
  return storageContainerDiv;
}
function popupStorageDialog(keyName) {
  var subContainer = document.getElementById("storagePopupMasterContainer");
  var parentContainer = document.getElementById("storagePopupMasterParent");
  parentContainer.removeChild(subContainer);
  subContainer = document.createElement("div");
  subContainer.id = "storagePopupMasterContainer";
  parentContainer.appendChild(subContainer);
  var downloadDiv = document.createElement("div");
  downloadDiv.id = "storagePopupDownload";
  if (keyName.substring(0, 9) == "B64_SRAM_") {
    var downloadDiv2 = document.createElement("div");
    downloadDiv2.id = "storagePopupDownloadRAW";
    downloadDiv2.appendChild(
      outputLocalStorageLink(
        "Download RAW save data.",
        findValue(keyName),
        keyName
      )
    );
    subContainer.appendChild(downloadDiv2);
    downloadDiv.appendChild(
      outputLocalStorageLink(
        "Download in import compatible format.",
        base64(
          generateBlob(keyName.substring(4), base64_decode(findValue(keyName)))
        ),
        keyName
      )
    );
  } else if (keyName.substring(0, 5) == "SRAM_") {
    var downloadDiv2 = document.createElement("div");
    downloadDiv2.id = "storagePopupDownloadRAW";
    downloadDiv2.appendChild(
      outputLocalStorageLink(
        "Download RAW save data.",
        base64(convertToBinary(findValue(keyName))),
        keyName
      )
    );
    subContainer.appendChild(downloadDiv2);
    downloadDiv.appendChild(
      outputLocalStorageLink(
        "Download in import compatible format.",
        base64(generateBlob(keyName, convertToBinary(findValue(keyName)))),
        keyName
      )
    );
  } else {
    downloadDiv.appendChild(
      outputLocalStorageLink(
        "Download in import compatible format.",
        base64(generateBlob(keyName, JSON.stringify(findValue(keyName)))),
        keyName
      )
    );
  }
  var deleteLink = generateLink(
    'javascript:deleteStorageSlot("' + keyName + '")',
    "Delete data item from HTML5 local storage."
  );
  deleteLink.id = "storagePopupDelete";
  subContainer.appendChild(downloadDiv);
  subContainer.appendChild(deleteLink);
}
function convertToBinary(jsArray) {
  var length = jsArray.length;
  var binString = "";
  for (var indexBin = 0; indexBin < length; indexBin++) {
    binString += String.fromCharCode(jsArray[indexBin]);
  }
  return binString;
}
function deleteStorageSlot(keyName) {
  deleteValue(keyName);
  refreshStorageListing();
}
function generateLink(address, textData) {
  var link = document.createElement("a");
  link.href = address;
  link.appendChild(document.createTextNode(textData));
  return link;
}
function generateDownloadLink(address, textData, keyName) {
  var link = generateLink(address, textData);
  link.download = keyName + ".sav";
  return link;
}
function checkStorageLength() {
  try {
    return window.localStorage.length;
  } catch (error) {
    //An older Gecko 1.8.1/1.9.0 method of storage (Deprecated due to the obvious security hole):
    return window.globalStorage[location.hostname].length;
  }
}
function getLocalStorageKeys() {
  var storageLength = checkStorageLength();
  var keysFound = [];
  var index = 0;
  var nextKey = null;
  while (index < storageLength) {
    nextKey = findKey(index++);
    if (nextKey !== null && nextKey.length > 0) {
      if (
        nextKey.substring(0, 5) == "SRAM_" ||
        nextKey.substring(0, 9) == "B64_SRAM_" ||
        nextKey.substring(0, 7) == "FREEZE_" ||
        nextKey.substring(0, 4) == "RTC_"
      ) {
        keysFound.push(nextKey);
      }
    } else {
      break;
    }
  }
  return keysFound;
}
function findKey(keyNum) {
  try {
    return window.localStorage.key(keyNum);
  } catch (error) {
    //An older Gecko 1.8.1/1.9.0 method of storage (Deprecated due to the obvious security hole):
    return window.globalStorage[location.hostname].key(keyNum);
  }
  return null;
}
//Some wrappers and extensions for non-DOM3 browsers:
function isDescendantOf(ParentElement, toCheck) {
  if (!ParentElement || !toCheck) {
    return false;
  }
  //Verify an object as either a direct or indirect child to another object.
  function traverseTree(domElement) {
    while (domElement != null) {
      if (domElement.nodeType == 1) {
        if (isSameNode(domElement, toCheck)) {
          return true;
        }
        if (hasChildNodes(domElement)) {
          if (traverseTree(domElement.firstChild)) {
            return true;
          }
        }
      }
      domElement = domElement.nextSibling;
    }
    return false;
  }
  return traverseTree(ParentElement.firstChild);
}
function hasChildNodes(oElement) {
  return typeof oElement.hasChildNodes == "function"
    ? oElement.hasChildNodes()
    : oElement.firstChild != null
    ? true
    : false;
}
function isSameNode(oCheck1, oCheck2) {
  return typeof oCheck1.isSameNode == "function"
    ? oCheck1.isSameNode(oCheck2)
    : oCheck1 === oCheck2;
}
function pageXCoord(event) {
  if (typeof event.pageX == "undefined") {
    return event.clientX + document.documentElement.scrollLeft;
  }
  return event.pageX;
}
function pageYCoord(event) {
  if (typeof event.pageY == "undefined") {
    return event.clientY + document.documentElement.scrollTop;
  }
  return event.pageY;
}
function mouseLeaveVerify(oElement, event) {
  //Hook target element with onmouseout and use this function to verify onmouseleave.
  return (
    isDescendantOf(
      oElement,
      typeof event.target != "undefined" ? event.target : event.srcElement
    ) &&
    !isDescendantOf(
      oElement,
      typeof event.relatedTarget != "undefined"
        ? event.relatedTarget
        : event.toElement
    )
  );
}
function mouseEnterVerify(oElement, event) {
  //Hook target element with onmouseover and use this function to verify onmouseenter.
  return (
    !isDescendantOf(
      oElement,
      typeof event.target != "undefined" ? event.target : event.srcElement
    ) &&
    isDescendantOf(
      oElement,
      typeof event.relatedTarget != "undefined"
        ? event.relatedTarget
        : event.fromElement
    )
  );
}
function addEvent(sEvent, oElement, fListener) {
  if (!oElement) return;
  try {
    oElement.addEventListener(sEvent, fListener, false);
    cout(
      'In addEvent() : Standard addEventListener() called to add a(n) "' +
        sEvent +
        '" event.',
      -1
    );
  } catch (error) {
    oElement.attachEvent("on" + sEvent, fListener); //Pity for IE.
    cout(
      'In addEvent() : Nonstandard attachEvent() called to add an "on' +
        sEvent +
        '" event.',
      -1
    );
  }
}
function removeEvent(sEvent, oElement, fListener) {
  try {
    oElement.removeEventListener(sEvent, fListener, false);
    cout(
      'In removeEvent() : Standard removeEventListener() called to remove a(n) "' +
        sEvent +
        '" event.',
      -1
    );
  } catch (error) {
    oElement.detachEvent("on" + sEvent, fListener); //Pity for IE.
    cout(
      'In removeEvent() : Nonstandard detachEvent() called to remove an "on' +
        sEvent +
        '" event.',
      -1
    );
  }
}
