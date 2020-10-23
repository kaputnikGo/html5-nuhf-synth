/*
//
// PilferShush: ultra high frequency transmitter
// for cityfreqs/pilfer.php
// multiple transmission modes
// Version 1.3
//
*/
var body = document.querySelector('body');
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
var oscillator = audioCtx.createOscillator();
var masterVolume = audioCtx.createGain();
var oscillator = audioCtx.createOscillator();
var baseFreq = 3000;
var synthMode = 1; // 1==Alpha, 2==BinaryBIT, 3==ClockFSK, 4==Twitch
var userMode = document.getElementsByName('usermode');
var frequencyArray = new Array();
var bitFreqArray = new Array();
var freqCounter = 0;
var freqNumber = 0;
var intervalPlay;
// synth has user variables
var userStep = document.getElementsByName('userstep');
var userCarrier = document.getElementsByName('usercarrier');
var userDistance = document.getElementsByName('userdistance');
var userDelay = document.getElementsByName('userdelay');
var userOver = document.getElementsByName('userover');
//
var toneDelay = 500; // default
var startFreq = 18000; // start value
var currentFreq = startFreq;
var stepFreq = 75; // default value
var candyLetter = "A"; // start value
var twitchMode = 0; // default
var twitchCarrier = 19750; // may not appear in stream
// fill array with A-Z
var letterArray = [];
for (var idx = 'A'.charCodeAt(0), end = 'Z'.charCodeAt(0); idx <= end; ++idx){
  letterArray.push(String.fromCharCode(idx));
  } 
letterArray.join();

var a4BitArray = [];
// really? bitwise shift left
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
var bitFreq = 0;
var bitFreq0 = 19200;
var bitFreq1 = 19500;

var carrierFreq = 18500;
var binaryDistance = 250;
var zeroFreq = 0; //can be a diff freq or user freq.

var render = document.querySelector('.render');
masterVolume.gain.value = 0.66;
oscillator.connect(masterVolume);
masterVolume.connect(audioCtx.destination);
// non-zero and freq jumps seem less pronounced with sine
oscillator.type = 'sine';
//oscillator.type = 'square';
oscillator.frequency.value = baseFreq;

/************************************************************************/
function stopIntervalPlay() {
  // reset everything
  clearInterval(intervalPlay);
  intervalPlay = 0;
  freqCounter = 0;
  freqNumber = 0;
  currentFreq = startFreq; // 18000
  masterVolume.disconnect(audioCtx.destination);
  
  render.setAttribute('data-state', "false");
  render.innerHTML = "PLAY SYNTH";
  document.querySelector('.display').innerHTML = "playing frequency: finished";
  console.log("finished playing sequence.");
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
    freqCounter += 1;
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
// test 1: 
// floor 18000hz
// ceiling 19500hz
// step 50hz
// delay 100ms
// range 1500hz
// bits 30
*/
function rangeSequence() {
  // play all the chars in order A-Z
  //
  letterArray.forEach(parseIt);
  function parseIt(value, index, array) {
    // value == A-Z, index == 0-25, array == letterArray
    //console.log("letter index: " + index);
    frequencyArray.push(startFreq + (stepFreq * index));
  }
}
function getTwitchFreq(request) {
  // compare request to letterArray value and send the freq,
  // separate function as may need to tweak diff from alphabet mode 
  // change to get indexOf 
  for (var i = 0; i <= 25; i++) {
    if (request === letterArray[i]) {
      return startFreq + (stepFreq * i);     
    }
  }
}

function load4BitBinary(c) {
  // c is a number
  // get 4 x binary numbers
  // A-Z is 18000 - 19300
  // 0 = 19350
  // 1 = 19400
  var freq = 0;
  var binaryChars = a4BitArray[c];
  //console.log("a4BitArray[c]: " + a4BitArray[c]);  
  //console.log("bitFreq: " + bitFreq);
  for (var i = 0; i <= 3; i++) {
    // this is a 0 or 1
    // will need a carrier gap between multiple 0s or 1s
    if (binaryChars.charAt(i) === '0') {
      // Z + step, 19350 - nom is diff
      frequencyArray.push(Number(bitFreq0));
    }
    else {
      // Z + step + step, 19400
      //frequencyArray.push(Number(bitFreq + stepFreq));
      // nominal version:
      frequencyArray.push(Number(bitFreq1));
    }
    // add twitchCarrier as gap
    frequencyArray.push(twitchCarrier);
  }
}
/*
function isNumeric(c) {
  return !isNaN(parseInt(c, 10));
}
*/
function loadTwitchSequence(charSequence) {
  // convert lowercase to uppercase
  // convert numbers to 4-bit binary (we have 4 bits spare)
  // init the array first
  frequencyArray = new Array();
  // add a ranging sequence covering all chars, quickly
  rangeSequence();
  var candy;
  var upperSeq = charSequence.toUpperCase();
  console.log("upperSeq: " + upperSeq); 

  for (let candy of upperSeq) {
    //console.log("pre candy: " + candy);  
    if (candy >= '0' && candy <= '9') {
      // convert to 4-bit binary
      // one number is 4 freqs
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
function parseTwitch() {
  var htmlRegex = /(<([^>]+)>)/ig;
  var regex = /\W/g; // non-alphanum chars
  var lineRegex = /\r?\n|\r/g; // newline
  var messageString = document.querySelector('.twitchmessage').innerHTML;
  messageString = messageString.replace(htmlRegex, "");
  messageString = messageString.replace(regex, " ");
  messageString = messageString.replace(lineRegex, " ");
  console.log(messageString);
  return messageString;
}

function twitchMode4() {
  console.log("Twitch Mode 4 nominal override: ");
  // attempting to get nominal frequency range
  // will prob lose some of the 4 bit binary in the vod
  stepFreq = 50; // same
  console.log("stepFreq: " + stepFreq);
  startFreq = 17800; // lower, end A-Z freq is 19100
  console.log("startFreq: " + startFreq);
  twitchCarrier = 19350; // mid of bits 0 and 1
  console.log("twitchCarrier: " + twitchCarrier);
  toneDelay = 100; // same
  console.log("toneDelay: " + toneDelay);
  bitFreq = 19200; // bit 0
  console.log("bitFreq: " + bitFreq);  
}
function twitchMode3() {
  console.log("Twitch Mode 3 delay override: ");
  // increase pulse time, due to missing/degraded W-Z
  stepFreq = 50;
  console.log("stepFreq: " + stepFreq);
  startFreq = 18000;
  console.log("startFreq: " + startFreq);
  twitchCarrier = 20000;
  console.log("twitchCarrier: " + twitchCarrier);
  toneDelay = 200;
  console.log("toneDelay: " + toneDelay); 
  bitFreq = startFreq + (stepFreq * 26) + stepFreq;
  console.log("bitFreq: " + bitFreq);
}
function twitchMode2() {
  console.log("Twitch Mode 2 stepFreq override: ");
  // reduce stepFeq size to 40Hz, due to missing/degraded W-Z
  stepFreq = 40;
  console.log("stepFreq: " + stepFreq);
  startFreq = 18000;
  console.log("startFreq: " + startFreq);
  twitchCarrier = 20000;
  console.log("twitchCarrier: " + twitchCarrier);
  toneDelay = 100;
  console.log("toneDelay: " + toneDelay);
  bitFreq = startFreq + (stepFreq * 26) + stepFreq;
  console.log("bitFreq: " + bitFreq);
}
function twitchMode1() {
  console.log("Twitch Mode 1 lowfreq override: ");
  // reduce by 4 * stepFreqs, due to missing/degraded W-Z
  stepFreq = 50;
  console.log("stepFreq: " + stepFreq);
  startFreq = 17800;
  console.log("startFreq: " + startFreq);
  twitchCarrier = 20000;
  console.log("twitchCarrier: " + twitchCarrier);
  toneDelay = 100;
  console.log("toneDelay: " + toneDelay); 
  bitFreq = startFreq + (stepFreq * 26) + stepFreq;
  console.log("bitFreq: " + bitFreq);
}
function twitchMode0() {
  console.log("Twitch Mode 0 default override: ");
  stepFreq = 50;
  console.log("stepFreq: " + stepFreq);
  startFreq = 18000;
  console.log("startFreq: " + startFreq);
  twitchCarrier = 20000;
  console.log("twitchCarrier: " + twitchCarrier);
  toneDelay = 100;
  console.log("toneDelay: " + toneDelay); 
  bitFreq = startFreq + (stepFreq * 26) + stepFreq;
  console.log("bitFreq: " + bitFreq);
}
function renderTwitch() {
  freqCounter = 0;
  // hard coded to nominal
  twitchMode4();
  /*
  // rem as this stage of testing is fin
  // set vars depending on mode selected
  switch (twitchMode) {
    case "0":
      twitchMode0();
      break;
    case "1":
      twitchMode1();
      break;
    case "2":
      twitchMode2();
      break;
    case "3":
      twitchMode3();
      break;
    case "4":
      twitchMode4();
      break;
    default:
      twitchMode0();
  }
  */
  loadTwitchSequence(parseTwitch());
}

/************************************************************************/
/*
//  Clock FSK Mode (Mode 3)
// render 8 bits via freqs above the carrier clock with freqStep separation
// MSB -> LSB (7-0) as carrier + distance + step (if bit 1 then + step)
// eg: 10111101 will be 
*/
function getClockFSKFreq(clockFSKRequest) {
  // send freq representation of 8bits
  // 
  if (clockFSKRequest === '0' ) {
    return (Number(carrierFreq) + Number(binaryDistance) + Number(stepFreq));
  }
  else if (clockFSKRequest === '1') {
    return (Number(carrierFreq) + Number(binaryDistance) + Number(stepFreq) + Number(stepFreq)); // dont concat strings...
  }
  else {
    return carrierFreq; // clock/carrier in sequence
  }
}
function loadClockFSKSequence(clockFSKSequence) {
  // will need freq rep clock and for 1 and 0
  // carrier...1...clock...1...clock...0...clock... etc
  frequencyArray = new Array();
  // load carrier equiv freq sequence first, 16 bit sentinel
  for (var i = 0; i < 16; i++) {
    frequencyArray.push(carrierFreq);
  }
  // then do:
  for (var i = 0; i < clockFSKSequence.length; i++) {
    // add the raw binary of 1,0 from html as a freq
    frequencyArray.push(getClockFSKFreq(clockFSKSequence.charAt(i)));
    // add carrierFreq after each binary load
    frequencyArray.push(carrierFreq);
  }
  // Ensure that execution duration is shorter than interval frequency
  intervalPlay = setInterval(playNUHFSequence, toneDelay); // delay in ms
}
function parseClockFSK() {
  var htmlRegex = /(<([^>]+)>)/ig;
  var messageString = document.querySelector('.clockfskmessage').innerHTML;
  messageString = messageString.replace(htmlRegex, "");
  console.log(messageString);
  return messageString;
}
function renderClockFSK() {
  freqCounter = 0;
  loadClockFSKSequence(parseClockFSK());
}

/************************************************************************/
/*
//  Binary Bit Mode (Mode 2)
// requires a start carrier freq tone of n length, 
// then 1 == carrier + distance
// then 0 == carrier - distance
// equal length silence between each discrete bit
// 0 Hz gap produces audible clicks, so:
// use carrierFreq as gap to have no clicks
// have user string/html symbol choice possible, hex to binary conversion
//
*/
function getBinaryFreq(binaryRequest) {
  // send freq representation of binary
  // 
  if (binaryRequest === '0' ) {
    return (carrierFreq - binaryDistance);
  }
  else if (binaryRequest === '1') {
    return (Number(carrierFreq) + Number(binaryDistance)); // dont concat strings...
  }
  else {
    return carrierFreq; // if gap in binary string sequence
  }
}
function loadBinarySequence(binarySequence) {
  // will need freq rep for 1 and 0, a carrier and a zero-gap 
  // carrier...1...gap...1...gap...0...gap... etc
  frequencyArray = new Array();
  // load carrier equiv freq sequence first, equal length of payload
  for (var i = 0; i < binarySequence.length; i++) {
    frequencyArray.push(carrierFreq);
  }
  // then do:
  for (var i = 0; i < binarySequence.length; i++) {
    // add the raw binary of 1,0 from html as a freq
    frequencyArray.push(getBinaryFreq(binarySequence.charAt(i)));
    // add carrierFreq after each binary load
    frequencyArray.push(carrierFreq);
  }
  // Ensure that execution duration is shorter than interval frequency
  intervalPlay = setInterval(playNUHFSequence, toneDelay); // delay in ms
}
function parseBinary() {
  var htmlRegex = /(<([^>]+)>)/ig;
  var messageString = document.querySelector('.binarymessage').innerHTML;
  messageString = messageString.replace(htmlRegex, "");
  console.log(messageString);
  return messageString;
}
function renderBinary() {
  freqCounter = 0;
  loadBinarySequence(parseBinary());
}
/************************************************************************/
/*
//  Alphabet Mode (Mode 1)
*/
function getCharFreq(letterRequest) {
  // compare letterRequest to letterArray value and send the freq
  if (letterRequest === 'A' ) {
    return startFreq;
  }
  else {
    for (var i = 1; i <= 26; i++) {
      if (letterRequest === letterArray[i]) {
        return currentFreq + (stepFreq * i);     
      }
    }
  }
}
function loadCharSequence(charSequence) {
  frequencyArray = new Array();
  for (var i = 0; i < charSequence.length; i++) {
    frequencyArray.push(getCharFreq(charSequence.charAt(i)));
  }
  //Ensure that execution duration is shorter than interval frequency
  intervalPlay = setInterval(playNUHFSequence, toneDelay); // delay in ms
}
function parseMessage() {
  var htmlRegex = /(<([^>]+)>)/ig;
  var messageString = document.querySelector('.alphamessage').innerHTML;
  messageString = messageString.replace(htmlRegex, "");
  console.log(messageString);
  return messageString;
}
function renderPoem() {
  freqCounter = 0;
  loadCharSequence(parseMessage());
}
/************************************************************************/
/*
//  General Functions
*/
function getUserValues() {
  // get synth mode
    for(i = 0; i < userMode.length; i++) { 
    if(userMode[i].checked) { 
      synthMode = userMode[i].value;
    }
  }
  console.log("synthMode: " + synthMode);
  
  // get all user values regardless of mode selected
  // 25, 50, 75, 100, 250 HZ
  for(i = 0; i < userStep.length; i++) { 
    if(userStep[i].checked) { 
      stepFreq = parseInt(userStep[i].value);
    }
  }
  console.log("stepFreq: " + stepFreq);
  
  // 18500, 19000, 19500, 20000, 20500, 21000 HZ
  for(i = 0; i < userCarrier.length; i++) { 
    if(userCarrier[i].checked) { 
      carrierFreq = userCarrier[i].value;
    }
  }
  console.log("carrierFreq: " + carrierFreq);
  
  // 100, 250, 500 HZ
  for(i = 0; i < userDistance.length; i++) { 
    if(userDistance[i].checked) { 
      binaryDistance = parseInt(userDistance[i].value);
    }
  }
  console.log("binaryDistance: " + binaryDistance);
  
  // Ensure that execution duration is shorter than interval frequency
  // 11, 25, 50, 100, 250, 500 MS
  for(i = 0; i < userDelay.length; i++) { 
    if(userDelay[i].checked) { 
      toneDelay = userDelay[i].value;
    }
  }
  console.log("toneDelay: " + toneDelay);  
  //
  // get twitch override mode
  for(i = 0; i < userOver.length; i++) { 
    if(userOver[i].checked) { 
      twitchMode = userOver[i].value;
    }
  }
  console.log("twitchMode: " + twitchMode);  
}
render.onclick = function() {
  console.log("playing synth!");
  if (render.getAttribute('data-state') === "false") {
    render.setAttribute('data-state', "true");
    render.innerHTML = "playing ...";
    getUserValues();
    // add switch osc here?
    // Standard values are "sine", "square", "sawtooth", "triangle" and "custom". The default is "sine".
    // or custom to use a PeriodicWave
    
    oscillator.start();
    
    if (synthMode ==='1') {
      console.log("Alphabet mode selected.");
      renderPoem();
    }
    else if (synthMode === '2') {
      console.log("Binary Bit mode selected.");
      renderBinary();
    }
    else if (synthMode === '3'){
      console.log("Clock FSK mode selected.");
      renderClockFSK();
    }
    else if (synthMode === '4'){
      console.log("Twitch mode selected.");
      renderTwitch();
    }
    else {
      console.log("error in mode select.");
    }
    masterVolume.connect(audioCtx.destination);
  }
  else {
    masterVolume.disconnect(audioCtx.destination);
    render.setAttribute('data-state', "false");
    render.innerHTML = "PLAY SYNTH";
  }  
}
