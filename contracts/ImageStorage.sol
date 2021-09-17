// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

contract ImageStorage {
  uint public imageCount = 0;
  mapping(uint => Image) public images;
  
  struct Image {
    uint id;
    string cid;
    string name;
    uint date;
    address from;
  }

  event ImageAdded (
    uint id,
    string cid,
    string name,
    uint date,
    address from
  );

  function addImages(string memory _cid, string memory _name) public {
    imageCount++;

    images[imageCount] = Image(imageCount, _cid, _name, block.timestamp, msg.sender);
    emit ImageAdded(imageCount, _cid, _name, block.timestamp, msg.sender);
  }
}