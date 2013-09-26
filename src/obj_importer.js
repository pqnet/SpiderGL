var md;
function TestMe() {
  var text = document.getElementById("objsrc").innerHTML;
  var parser = new objImporter({onEndParsing:function(modelDescriptor){ md = modelDescriptor; }});
  parser.streamData({completed:function(){ return true},getData:function() {return text;} });
  return parser;
}
var objImporter = function (callbacks) {
  this.callbacks = callbacks;
  this.unprocessedStream = "";
  this.vertexData = {
    positions:[],
    txtcoords:[],
    normals:[]
  }
  this.groups = {};
  this.activeGroups = { "default":this.getGroup("default") }
  this.mtlname = "";
}

objImporter.prototype = {
  streamData: function(stream) {
    var completed = stream.completed();
    var lines = (this.unprocessedStream + stream.getData() ).split('\n');
    if (!completed)
      this.unprocessedStream = lines.pop();
    for (var i = 0; i < lines.length; i++)
      this.processLine(lines[i]);
    if (completed)
      this.EOF();
  },
  EOF: function() {
    var modelDescriptor =// importObj(objData);
    {
       version: "0.0.1.0 EXP",
       meta: {
       },
       data: {
           vertexBuffers: {
           },
           indexBuffers: {
           }
       },
       access: {
           vertexStreams: {
           },
           primitiveStreams: {
           }
       },
       semantic: {
           bindings: {
           },
           chunks: {
           }
       },
       logic: {
           parts: {
           }
       },
       control: {
       },
       extra: {
       }
    };
    //create a VertexStream and PrimitiveStream
    for (var g in this.groups)
    {
      var currentGroup = this.groups[g];
      var gId = "g" + g;
      modelDescriptor.logic.parts[gId+"_part"] = {chunks:[]};
      for (var c =0; c < currentGroup.chunks.length; c++)
      {
        var cId = gId + "_c" + c;
        var currentChunk = currentGroup.chunks[c];
        //add vertex data
        modelDescriptor.data.vertexBuffers[cId+"_pos_vb"] = { typedArray: new Float32Array(currentChunk.positionsArray) };
        modelDescriptor.access.vertexStreams[cId +"_pos_attr"] = { //see glVertexAttribPointer
            buffer: cId + "_pos_vb",
            size: 3,
            type: SpiderGL.Type.FLOAT32,
            stride: 4 * currentGroup.positionsStride,
            offset: 0,
            normalized: false
          };
        if(currentGroup.usingTextureCoordinates)
        {
          modelDescriptor.data.vertexBuffers[cId + "_txt_vb"] = { typedArray: new Float32Array(currentChunk.txtcoordsArray) };
          modelDescriptor.access.vertexStreams[cId +"_txt_attr"] = { //see glVertexAttribPointer
            buffer: cId + "_txt_vb",
            size: this.vertexData.txtCoord3d?3:2, 
            type: SpiderGL.Type.FLOAT32,
            stride: 4 * currentGroup.txtcoordsStride,
            offset: 0,
            normalized: false
          }; 
          //modelDescriptor.semantic.bindings[g + "_binding"].vertexStreams["TXTCOORD"] = [g+"_txt_attr"];
        }
        if(currentGroup.usingNormals)
        {
          modelDescriptor.data.vertexBuffers[cId + "_nrm_vb"] = { typedArray: new Float32Array(currentChunk.normalsArray) };
          modelDescriptor.access.vertexStreams[cId +"_nrm_attr"] = { //see glVertexAttribPointer
            buffer: cId + "_nrm_vb",
            size: 3,
            type: SpiderGL.Type.FLOAT32,
            stride: 4 * currentGroup.normalsStride,
            offset: 0,
            normalized: false
          }; 
          //modelDescriptor.semantic.bindings[g + "_binding"].vertexStreams["NORMAL"] = [g+"_nrm_attr"];
        }

        for(var m in currentChunk.materials)
        {
          var mId = cId + "_m" + m;
          var currentMaterial = currentChunk.materials[m];
          if (0 == currentMaterial.indicesArray.length)
            continue;

          modelDescriptor.data.indexBuffers[mId +"_idx_b"] = { typedArray: new Uint16Array(currentMaterial.indicesArray) };
          modelDescriptor.access.primitiveStreams[mId + "_ps"] = { //see glDrawElements
              buffer: mId + "_idx_b",
              mode: SpiderGL.Type.TRIANGLES,
              count: currentMaterial.indicesArray.length,
              type: SpiderGL.Type.UINT16,
              offset: 0
          };

          var currentBinding = (modelDescriptor.semantic.bindings[mId + "_binding"] = { primitiveStreams:{}, vertexStreams:{}});
          currentBinding.vertexStreams["POSITION"] = [cId + "_pos_attr"];
          if(currentGroup.usingTextureCoordinates)
            currentBinding.vertexStreams["TXTCOORD"] = [cId + "_txt_attr"];
          if(currentGroup.usingNormals)
            currentBinding.vertexStreams["NORMAL"] = [cId +"_nrm_attr"];

          currentBinding.primitiveStreams["FILL"]= [mId +"_ps"];

          modelDescriptor.semantic.chunks[mId+"_chunk"] = {techniques:{common:{binding:mId + "_binding"}}};
          modelDescriptor.logic.parts[gId+"_part"].chunks.push(mId+"_chunk");
        }
      }
    }
    if(this.callbacks.onEndParsing) this.callbacks.onEndParsing(modelDescriptor);
  }
  ,
  getGroup: function(groupName) {
    var Group = function(parserObj) {
        this.positionsStride = 3;
        this.txtcoordsStride = 3;
        this.normalsStride = 3;
        this.chunks = [];
        this.usingTextureCoordinates = false;
        this.usingNormals = false;
        this.parserObj = parserObj;
    }
    Group.prototype  = {
      newChunk:function() {
        this.chunks.push({positionsArray:[],txtcoordsArray:[],normalsArray:[],materials:{},map:[]});
        return this.chunks.length - 1;
      },
      addFace:function(v1,v2,v3){
        //put the new vertices in the first available chunk vertex array
        var i = 0;
        for (i = 0; i <this.chunks.length; i++)
        {
          var positionsArray = this.chunks[i].positionsArray;
          var firstFreeIdx = ( (positionsArray.length + this.positionsStride - 1) / this.positionsStride ) | 0; 
          var haveToInsert = 0;
          if(this.hasVertex.apply(this,[i].concat(v1))) haveToInsert++;
          if(this.hasVertex.apply(this,[i].concat(v2))) haveToInsert++;
          if(this.hasVertex.apply(this,[i].concat(v3))) haveToInsert++;
          if (haveToInsert + firstFreeIdx <= 0x10000) 
            break;
        }
        if(i == this.chunks.length) this.newChunk();
        this.getCurrentMaterial(i).indicesArray.push(
              this.getVertex.apply(this,[i].concat(v1)),
              this.getVertex.apply(this,[i].concat(v2)),
              this.getVertex.apply(this,[i].concat(v3)));
      },
      hasVertex:function(vb,v,vt,vn) {
        map= this.chunks[vb].map
        return undefined !== (map[v] && map[v][vt] && map[v][vt][vn]);
      },
      getVertex:function(vb,v,vt,vn){
        var chunk = this.chunks[vb];
        var map = chunk.map;
        v = v | 0;
        //vt = vt | 0;
        //vn = vn | 0;

        if ( undefined === map[v]) map[v] = {}; 
        if ( undefined === map[v][vt]) map[v][vt] = {}; 
        if ( undefined === map[v][vt][vn])
        {
          var positions = this.parserObj.vertexData.positions;
          var txtcoords = this.parserObj.vertexData.txtcoords;
          var normals = this.parserObj.vertexData.normals;
          var idx = ( (chunk.positionsArray.length + this.positionsStride - 1) / this.positionsStride ) | 0; 
          if (idx > 0xffff) return undefined;
          var posIdx = idx;
          var txtIdx = idx;
          var nrmIdx = idx;
          //var posIdx = ( (positionsArray.length() + this.positionsStride - 1) / this.positionsStride ) | 0  + 1;
          //var txtIdx = ( (txtcoordsArray.length() + this.txtcoordsStride - 1) / this.txtcoordsStride ) | 0  + 1;
          //var nrmIdx = ( (normalsArray.length() + this.normalsStride - 1) / this.normalsStride ) | 0  + 1;
          if ((v * 3 + 2) < positions.length) {
            chunk.positionsArray[posIdx * this.positionsStride + 0] = positions[v*3+0];
            chunk.positionsArray[posIdx * this.positionsStride + 1] = positions[v*3+1];
            chunk.positionsArray[posIdx * this.positionsStride + 2] = positions[v*3+2];
          } else throw "no!";

          if (vt >=0 && (vt * 3 + 2) < txtcoords.length) {
            chunk.txtcoordsArray[txtIdx * this.txtcoordsStride + 0] = txtcoords[vt*3+0];
            chunk.txtcoordsArray[txtIdx * this.txtcoordsStride + 1] = txtcoords[vt*3+1];
            chunk.txtcoordsArray[txtIdx * this.txtcoordsStride + 2] = txtcoords[vt*3+2];
            this.usingTextureCoordinates = true;
          } else {
            chunk.txtcoordsArray[txtIdx * this.txtcoordsStride + 0] = 0.0;
            chunk.txtcoordsArray[txtIdx * this.txtcoordsStride + 1] = 0.0;
            chunk.txtcoordsArray[txtIdx * this.txtcoordsStride + 2] = 0.0;
          }


          if (vn >=0 && (vn * 3 + 2) < normals.length) {
            chunk.normalsArray[nrmIdx * this.normalsStride + 0] = normals[vn*3+0];
            chunk.normalsArray[nrmIdx * this.normalsStride + 1] = normals[vn*3+1];
            chunk.normalsArray[nrmIdx * this.normalsStride + 2] = normals[vn*3+2];
            this.usingNormals = true;
          } else {
            chunk.normalsArray[nrmIdx * this.normalsStride + 0] = 0.0;
            chunk.normalsArray[nrmIdx * this.normalsStride + 1] = 0.0;
            chunk.normalsArray[nrmIdx * this.normalsStride + 2] = 0.0;
          }

          map[v][vt][vn] = idx;
        }
        return map[v][vt][vn] | 0;
      },
      getCurrentMaterial:function(vb) {
        if (this.chunks[vb].materials[this.parserObj.mtname] === undefined)
          this.chunks[vb].materials[this.parserObj.mtname] = {indicesArray:[]};
        return this.chunks[vb].materials[this.parserObj.mtname];
      }
    }
    var g = this.groups[groupName];
    if (!g)
      g = new Group(this);
    this.groups[groupName] = g;
    return g;
  }
  ,
  processLine: function(line) {
    var tokens =
      line
      .replace(/\s+/g," ")
      .trim()
      .split(" ");
    var parseVertex = function(_x,_y,_z) {
      var x = parseFloat(_x);
      var y = parseFloat(_y);
      var z = parseFloat(_z);
      this.vertexData.positions.push(x,y,z);
    }
    var parseTxtCoords = function(_x,_y,_z) {
      var x = parseFloat(_x);
      var y = parseFloat(_y);
      var z = parseFloat(_z);
      if (isNaN (z))
        z = 0.0;
      else
        this.vertexData.txtCoord3d = true;
      this.vertexData.txtcoords.push(x,y,z);
    }
    var parseNormals = function(_x,_y,_z) {
      var x = parseFloat(_x);
      var y = parseFloat(_y);
      var z = parseFloat(_z);
      this.vertexData.normals.push(x,y,z);
    }
    var parseFace = function(_v1,_v2,_v3) {
      var mapper = function (txt) {return parseInt(txt) - 1; }
      var v1 = _v1.split('/').map(mapper)
      var v2 = _v2.split('/').map(mapper)
      var v3 = _v3.split('/').map(mapper)
      for(currentGroup in this.activeGroups) {
        this.activeGroups[currentGroup].addFace(v1,v2,v3);
      }
      if (arguments.length > 3)
      {
        // from [0,1,2,3,...] to [0,2,3,...]
        arguments[0] = Array.prototype.shift.call(arguments);       
        parseFace.apply(this,arguments);
      }
    }
    var parseGroup = function(groupName) {
        if(arguments.length >0) {
          parseGroup.apply(this,Array.prototype.slice.call(arguments,1));
          this.activeGroups[groupName] = this.getGroup(groupName);
        } else {
          this.activeGroups = {};
        }
    }
    switch(tokens.shift()) {
      case "v": // vertex data
        parseVertex.apply(this,tokens);
        break;
      case "vt": // texture coordinate data
        parseTxtCoords.apply(this,tokens);
        break;
      case "vn": // normal data
        parseNormals.apply(this,tokens);
        break;
      case "f": // face data (indexes)
        parseFace.apply(this,tokens);
        break;
      case "o": // defines object name
        this.objectName = tokens[0];
        break;
      case "g": // change current group in the current object
        parseGroup.apply(this,tokens); 
        break;
      case "mtllib": // name of material library file
        this.callbacks.requireMaterialFile(tokens[0]);
        break;
      case "usemtl":
        this.mtlname = tokens[0]||"";
        break;
      case "s":
    }
  }
}
