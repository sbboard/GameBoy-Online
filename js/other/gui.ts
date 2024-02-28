declare function start(canvas, ROM);
declare function GameBoyEmulatorInitialized(): boolean;
declare function GameBoyKeyDown(key);
declare function GameBoyKeyUp(key);
declare function openState(
  savedStateFileName: string,
  mainCanvas: HTMLCanvasElement
);
declare var gameboy: any;
declare var settings: any;

var mainCanvas: HTMLCanvasElement | null = null;
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
  mainCanvas = document.getElementById("mainCanvas") as HTMLCanvasElement;
  document.addEventListener("keydown", keyDown, false);
  document.addEventListener("keyup", (event) => keyUp(event), false);
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
        try {
          //Gecko 1.9.2+ (Standard Method)
          var binaryHandle = new FileReader();
          binaryHandle.onload = function () {
            if (this.readyState == 2) {
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
            }
          };
          binaryHandle.readAsBinaryString(file);
        } catch (error) {
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
      }
    } catch (error) {
      /* empty */
    }
  }
}

function mute(e: Event) {
  const target = e.target as HTMLInputElement;
  settings[0] = !target.checked;
  if (GameBoyEmulatorInitialized()) gameboy.initSound();
}

function reset() {
  if (!GameBoyEmulatorInitialized()) return;
  try {
    if (!mainCanvas) return;
    if (!gameboy.fromSaveState) start(mainCanvas, gameboy.getROMImage());
    else openState(gameboy.savedStateFileName, mainCanvas);
  } catch (error) {
    alert(
      error.message + " file: " + error.fileName + " line: " + error.lineNumber
    );
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

function findValue(key) {
  if (window.localStorage.getItem(key)) {
    return JSON.parse(window.localStorage.getItem(key) as string);
  }
  return null;
}

function setValue(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function deleteValue(key) {
  window.localStorage.removeItem(key);
}
