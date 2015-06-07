/* Copyright (c) 2015 Dennis Bemmann. See the file LICENSE for copying permission. */
/*
W25Q.js
========

Driver for Winbond 25Q series SPI Flash RAM
Tested with W25Q80BV, http://www.adafruit.com/datasheets/W25Q80BV.pdf

Still under development, so no documentation yet
*/

function Flash(spi, csPin) {
  this.spi = spi;
  this.csPin = csPin;
}

Flash.prototype.seek = function(pageNumber, offset) { 
  // seeks to an address for sequential reading
  this.command(0x03);
  this.setAddress(pageNumber, offset);
  // stays selected until client finishes reading
};

Flash.prototype.read = function() {
  // reads a byte
  return this.spi.send(0);
};

Flash.prototype.waitReady = function() {
  // waits until chip is ready
  this.command(0x05);
  while (this.read() & 1);
  digitalWrite(this.csPin, 1);
};

Flash.prototype.eraseChip = function() {
  // overwrite whole chip with 0xFF
  this.command(0x06);
  this.command(0xC7);
  this.waitReady();
};

Flash.prototype.erase16Pages = function(pageNumber) {
  // overwrite 16 pages (of 256 bytes each) with 0xFF
  this.command(0x06);
  this.command(0x20);
  this.setAddress(pageNumber, 0);
  this.waitReady();
};

Flash.prototype.writePage = function(pageNumber, arrayBuffer) {
  // overwrites a page (256 bytes)
  // that memory MUST be erased first
  this.seekWrite(pageNumber, 0);
  for (var i=0; i<arrayBuffer.length; i++) this.write(arrayBuffer[i]);
  this.finishWrite();
};

Flash.prototype.startWrite = function(pageNumber, offset) {
  // seeks to address for sequential overwriting of memory
  // that memory MUST be erased first!
  // to end the operation, call finish
  this.command(0x06);
  this.command(0x02);
  this.setAddress(pageNumber, offset);
};

Flash.prototype.send = function(data) {
  // sends data and returns result
  return this.spi.send(data);
};

Flash.prototype.write = function(data) {
  // writes data without returning result
  this.spi.write(data);
};

Flash.prototype.finish = function() {
  // ends current operation, for example a sequential write
  digitalWrite(this.csPin, 1);
  this.waitReady();
};

Flash.prototype.getJedec = function() {
  // gets chips's JEDEC information
  this.command([0x90, 0, 0, 0]);
  var res = {};
  res.manufacturerId = this.read();
  res.deviceId = this.read();
  digitalWrite(this.csPin, 1);
  return res;
};

Flash.prototype.getCapacity = function() {
  // gets chip's capacity
  this.command(0x9f);
  this.read();
  var cap = this.read() * 16384;
  digitalWrite(this.csPin, 1);
  return cap;
};

Flash.prototype.command = function(cmd) {
  // for internal use only
  digitalWrite(this.csPin, 1);
  digitalWrite(this.csPin, 0);
  this.spi.write(cmd);
};

Flash.prototype.setAddress = function(pageNumber, offset) {
  // for internal use only
  this.spi.write([
    (pageNumber >> 8) & 0xFF,
    (pageNumber >> 0) & 0xFF,
    (offset     >> 0) & 0xFF
  ]);
};

exports.connect = function(spi, csPin) {
  var flash = new Flash(spi, csPin);
  jedec = flash.getJedec();
  if ((jedec.manufacturerId != 0xEF) || (jedec.deviceId != 0x13)) flash = null;
  return flash;
};
