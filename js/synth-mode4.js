/*
//
// PilferShush: ultra high frequency transmitter
// for cityfreqs/pilfer.php
// mode 4 Twitch Override
// simplified for purpose
// Version 1.0
//
*/
var body = document.querySelector('body');
// buttons
var render = document.querySelector('.render');
var loader = document.querySelector('.loader');
var stopper = document.querySelector('.stopper');
// text dropdowns
var textPA = document.getElementById('text-pa');
var textCO = document.getElementById('text-co');

// webAudio init
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
var oscillator;
var masterVolume;
initAudio();
var intervalPlay;
// init vars, overrides in twitchMode()
var toneDelay = 500; // default
var startFreq = 18000; // start value
var stepFreq = 75; // default value
var twitchCarrier = 19750; // may not appear in stream
// text file vars
var textPAnum = 0; // dropdown text index
var textCOnum = 0; // dropdown text index
var textPAurls = [];
textPAurls[0] = "nothing";
textPAurls[1] = "./js/textPA1.txt";
textPAurls[2] = "./js/textPA2.txt";
textPAurls[3] = "./js/textPA3.txt";
var textCOurls = [];
textCOurls[0] = "nothing";
textCOurls[1] = "./js/textCO1.txt";
textCOurls[2] = "./js/textCO2.txt";
textCOurls[3] = "./js/textCO3.txt";
textCOurls[4] = "./js/textCO4.txt";
textCOurls[5] = "./js/textCO5.txt";
textCOurls[6] = "./js/textCO6.txt";
// freq loop vars
var elemKaraoke;
var karaokeLength = 0;
var messageString;
var frequencyArray = new Array();
var bitFreqArray = new Array();
var freqCounter = 0;
var freqNumber = 0;
// array with A-Z
var letterArray = [];
for (var idx = 'A'.charCodeAt(0), end = 'Z'.charCodeAt(0); idx <= end; ++idx){
  letterArray.push(String.fromCharCode(idx));
} 
letterArray.join();
// array with 4 bit binary numbers
var a4BitArray = [];
a4BitArray[0] = "0000";
a4BitArray[1] = "0001";
a4BitArray[2] = "0010";
a4BitArray[3] = "0011";
a4BitArray[4] = "0100";
a4BitArray[5] = "0101";
a4BitArray[6] = "0110";
a4BitArray[7] = "0111";
a4BitArray[8] = "1000";
a4BitArray[9] = "1001";
// freq representation of bits
var bitFreq0 = 19200;
var bitFreq1 = 19500;
/************************************************************************/
function initAudio() {
  console.log("Init audio");
  oscillator = audioCtx.createOscillator();
  masterVolume = audioCtx.createGain();
  // gain increase can cause compression of bg music
  masterVolume.gain.value = 0.5;
  oscillator.connect(masterVolume);
  masterVolume.connect(audioCtx.destination);
  // non-zero and freq jumps seem less pronounced with sine
  oscillator.type = 'sine';
  // start sequence audible tone of 3000hz
  oscillator.frequency.value = 3000;
}
function stopIntervalPlay() {
  // stop everything
  clearInterval(intervalPlay);
  oscillator.stop();
  intervalPlay = 0;
  freqCounter = 0;
  freqNumber = 0;
  masterVolume.disconnect(audioCtx.destination);
  render.setAttribute('data-state', "false");
  render.innerHTML = "PLAY SYNTH";
  document.querySelector('.display').innerHTML = "playing frequency: finished";
  console.log("finished playing sequence.");
  // reset
  initAudio();
}
function playNUHFSequence() { 
  if (freqCounter >= frequencyArray.length) {
    stopIntervalPlay();
    return;
  }
  else {
    freqNumber = Number(frequencyArray[freqCounter]);
    document.querySelector('.display').innerHTML = "playing frequency: " + freqNumber + " hz";
    oscillator.frequency.value = freqNumber; 
    paintKaraoke();
    freqCounter += 1;
  }  
} 
function msToTime(s) {
  function pad(n, z) {
    z = z || 2;
    return ('00' + n).slice(-z);
  }
  var ms = s % 1000;
  s = (s - ms) / 1000;
  var secs = s % 60;
  s = (s - secs) / 60;
  var mins = s % 60;
  var hrs = (s - mins) / 60;
  
   return pad(mins) + ':' + pad(secs);
}
 
function loadKaraoke() {
  // have loaded text passage into .karaokemessage so sing-a-long now
  // twitchCarrier is a space char
  elemKaraoke = document.getElementById("loadmessage");
  karaokeLength = elemKaraoke.innerText.length;
  console.log("karaokeLength: " + karaokeLength);
  document.querySelector('#karaokemessage').innerText = "";
  document.querySelector('.textnums').innerHTML = "total: " + karaokeLength + " current: 0";
  document.querySelector('.playtime').innerHTML = "est time: " + msToTime(Number(karaokeLength * 100));
}
function paintKaraoke() {
  if (freqCounter < karaokeLength) {
    document.querySelector('#karaokemessage').innerHTML += elemKaraoke.innerText[freqCounter];
    document.getElementById("karaokemessage").scrollTop = document.getElementById("karaokemessage").scrollHeight;
    document.querySelector('.textnums').innerHTML = "total: " + karaokeLength + " current: " + freqCounter;
  }
  else {
    console.log("end of line");
  }
}
/************************************************************************/
/*
//  Twitch Mode (Mode 4)
// mode to transmit long passages of text as alphabet tones 
// to Twitch stream via OBS
//
// tested in OBS/Twitch upstream to downstream VOD 
// within current maximum frequencies -
// need to test live stream frequency response
//
*/
function rangeSequence() {
  // play all the chars in A-Z order
  letterArray.forEach(parseIt);
  function parseIt(value, index, array) {
    //console.log("letter index: " + index);
    frequencyArray.push(startFreq + (stepFreq * index));
  }
}
function getTwitchFreq(request) {
  // compare request to letterArray value and send the freq,
  // change to get indexOf 
  for (var i = 0; i <= 25; i++) {
    if (request === letterArray[i]) {
      return startFreq + (stepFreq * i);     
    }
  }
}
function load4BitBinary(c) {
  // get 4 x binary numbers from c
  var binaryChars = a4BitArray[c];
  //console.log("a4BitArray[c]: " + a4BitArray[c]);  
  for (var i = 0; i <= 3; i++) {
    if (binaryChars.charAt(i) === '0') {
      frequencyArray.push(Number(bitFreq0));
    }
    else {
      frequencyArray.push(Number(bitFreq1));
    }
    // add twitchCarrier as gap
    frequencyArray.push(twitchCarrier);
  }
}
function loadTwitchSequence(charSequence) {
  // convert lowercase to uppercase
  // & convert numbers to 4-bit binary
  frequencyArray = new Array();
  // first add a ranging sequence covering all chars
  rangeSequence();
  var candy;
  //var upperSeq = charSequence.toUpperCase();
  charSequence = charSequence.toUpperCase();
  //console.log("charSequence: " + charSequence); 

  for (let candy of charSequence) {
    //console.log("pre candy: " + candy);  
    if (candy >= '0' && candy <= '9') {
      // convert to 4-bit binary
      // function loads frequencyArray directly
      //console.log("load4BitArray[candy]: " + candy);  
      load4BitBinary(candy);
    }
    else if (candy === " ") {
      // add carrier
      frequencyArray.push(twitchCarrier);
    }
    else {
      // simple A-Z freq convert
      //console.log("twitchFreq(candy): " + candy);  
      frequencyArray.push(getTwitchFreq(candy));
    }
  }
  //Ensure that execution duration is shorter than interval frequency
  intervalPlay = setInterval(playNUHFSequence, toneDelay); // delay in ms
}
function parseTwitch(messageString) {
  var htmlRegex = /(<([^>]+)>)/ig;
  var regex = /\W/g; // non-alphanum chars
  var lineRegex = /\r?\n|\r/g; // newline
  messageString = document.querySelector('#loadmessage').innerHTML;
  messageString = messageString.replace(htmlRegex, "");
  messageString = messageString.replace(regex, " ");
  messageString = messageString.replace(lineRegex, " ");
  console.log(messageString);
  loadKaraoke();
  return messageString;
}
function getText() {
  // using textPA, textCO get text blocks into string
  // get url based upon index from textPAnum, textCOnum
  
  // check only one num sent, 0 == nothing
  var textUrl;
  if (((textPAnum === 0) && (textCOnum === 0)) || ((textPAnum >= 1) && (textCOnum >= 1))) {
    // have nothing, use PM placeholder
    textUrl = "./js/introPM.txt";
  }
  else if (textPAnum >= 1) {
    textUrl = textPAurls[textPAnum];// ie. './js/textPA1.txt';
  }
  else {
    textUrl = textCOurls[textCOnum];// ie. './js/textCO1.txt';
  }
  
  fetch(textUrl)
    .then(response => response.text())
    .then(function(data) {
      // directly load the text block with the text
      document.querySelector('#loadmessage').innerHTML = data;
      document.querySelector('.textnums').innerHTML = "total: " + data.length + " current: 0";
  })
}
function loadTextIndex() {
  // from the dropdowns
  // must do checks here for proper values
  
  // Privacy Act, 0 == nothing
  textPAnum = Number(textPA.value);
  console.log("textPA: " + textPAnum);
  // Health Amend, 0 == nothing
  textCOnum = Number(textCO.value);
  console.log("textCO: " + textCOnum);
}
function twitchMode() {
  console.log("Twitch Mode 4 settings: ");
  stepFreq = 50; // same
  console.log("stepFreq: " + stepFreq);
  startFreq = 17800; // lower, end A-Z freq is 19100
  console.log("startFreq: " + startFreq);
  twitchCarrier = 19350; // mid of bits 0 and 1
  console.log("twitchCarrier: " + twitchCarrier);
  toneDelay = 100; // same
  console.log("toneDelay: " + toneDelay);
  bitFreq0 = 19200; // bit 0
  console.log("bitFreq0: " + bitFreq0); 
  bitFreq1 = 19500; // bit 1
  console.log("bitFreq1: " + bitFreq1);
}
function renderTwitch() {
  freqCounter = 0;
  // load settings
  twitchMode();
  // parse text
  loadTwitchSequence(parseTwitch());
}
/************************************************************************/
/*
//  General Functions
*/
loader.onclick = function() {
  console.log("loading text...");
  if (loader.getAttribute('data-state') === "false") {
    loader.setAttribute('data-state', "true");
    // load the text passage
    loadTextIndex();
    getText();
    loader.innerHTML = "loaded";
  }
  else {
    loader.setAttribute('data-state', "false");
    loader.innerHTML = "LOAD TEXT";
  }  
}
render.onclick = function() {
  console.log("playing synth!");
  if (render.getAttribute('data-state') === "false") {
    render.setAttribute('data-state', "true");
    render.innerHTML = "playing ...";
    oscillator.start();
    renderTwitch();
    masterVolume.connect(audioCtx.destination);
  }
  else {
    masterVolume.disconnect(audioCtx.destination);
    render.setAttribute('data-state', "false");
    render.innerHTML = "PLAY SYNTH";
  }  
}
stopper.onclick = function() {
  console.log("STOP ALL");
  if (stopper.getAttribute('data-state') === "false") {
    stopper.setAttribute('data-state', "true");
    // call a halt and reset
    stopIntervalPlay();
    render.setAttribute('data-state', "false");
    render.innerHTML = "PLAY SYNTH";
    stopper.innerHTML = "STOPPED";
  }
  else {
    stopper.setAttribute('data-state', "false");
    stopper.innerHTML = "STOP ALL";
  }
}  

