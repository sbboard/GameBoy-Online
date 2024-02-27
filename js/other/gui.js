var mainCanvas = null;
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

function windowingInitialize(rom) {
  mainCanvas = document.getElementById("mainCanvas");
  registerGUIEvents();
  document.getElementById("enable_sound").checked = settings[0];
  createFile(rom);
}

async function createFile(romFile) {
  if (!romFile) return;
  let response = await fetch(`/testRoms/${romFile}`);
  let data = await response.blob();
  let file = new File([data], `rom.${romFile.split(".")[1]}`);
  openFile(file);
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

function registerGUIEvents() {
  cout("In registerGUIEvents() : Registering GUI Events.", -1);
  addEvent("keydown", document, keyDown);
  addEvent("keyup", document, function (event) {
    keyUp(event);
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

  //restart button
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

  //unpause button
  addEvent("click", document.getElementById("run_cpu_clicker"), function () {
    run();
  });

  //pause
  addEvent("click", document.getElementById("kill_cpu_clicker"), function () {
    pause();
  });

  addEvent("click", document.getElementById("enable_sound"), function () {
    settings[0] = document.getElementById("enable_sound").checked;
    if (GameBoyEmulatorInitialized()) {
      gameboy.initSound();
    }
  });
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
