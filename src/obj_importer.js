var md;
function TestMe() {
  var text = document.getElementById("objsrc").innerHTML;
  var parser = new objImporter({endParsing:function(modelDescriptor){ md = modelDescriptor; }});
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
    for (g in this.groups)
    {
      var currentGroup = this.groups[g];
      //add vertex data
      modelDescriptor.semantic.bindings[g + "_binding"] = {vertexStreams:{},primitiveStreams:{} }
      modelDescriptor.data.vertexBuffers[g + "_pos_vb"] = { typedArray: new Float32Array(currentGroup.positionsArray) };
      modelDescriptor.access.vertexStreams[g +"_pos_attr"] = { //see glVertexAttribPointer
          buffer: g + "_pos_vb",
          size: 3,
          type: SpiderGL.Type.FLOAT32,
          stride: 3 * currentGroup.positionsStride,
          offset: 0,
          normalized: false
		    };
      modelDescriptor.semantic.bindings[g + "_binding"].vertexStreams["POSITION"] = [g+"_pos_attr"];
      if(currentGroup.usingTextureCoordinates)
      {
        modelDescriptor.data.vertexBuffers[g + "_txt_vb"] = { typedArray: new Float32Array(currentGroup.txtcoordsArray) };
        modelDescriptor.access.vertexStreams[g +"_txt_attr"] = { //see glVertexAttribPointer
          buffer: g + "_txt_vb",
          size: 2, //todo: support 3d txt coordinates
          type: SpiderGL.Type.FLOAT32,
          stride: 3 * currentGroup.txtcoordsStride,
          offset: 0,
          normalized: false
        }; 
        modelDescriptor.semantic.bindings[g + "_binding"].vertexStreams["TXTCOORD"] = [g+"_txt_attr"];
      }
      if(currentGroup.usingNormals)
      {
        modelDescriptor.data.vertexBuffers[g + "_nrm_vb"] = { typedArray: new Float32Array(currentGroup.normalsArray) };
        modelDescriptor.access.vertexStreams[g +"_nrm_attr"] = { //see glVertexAttribPointer
          buffer: g + "_nrm_vb",
          size: 3,
          type: SpiderGL.Type.FLOAT32,
          stride: 3 * currentGroup.normalsStride,
          offset: 0,
          normalized: false
        }; 
        modelDescriptor.semantic.bindings[g + "_binding"].vertexStreams["NORMAL"] = [g+"_nrm_attr"];
      }
      modelDescriptor.data.indexBuffers[g + "_idx_b"] = { typedArray: new Uint16Array(currentGroup.indicesArray) };
      modelDescriptor.access.primitiveStreams[g + "_ps"] = { //see glDrawElements
		        buffer: g + "_idx_b",
		        mode: SpiderGL.Type.TRIANGLES,
		        count: 3,
		        type: SpiderGL.Type.UINT16,
		        offset: 0
		    };
      modelDescriptor.semantic.bindings[g + "_binding"].primitiveStreams["FILL"] = [g+"_ps"];
      modelDescriptor.semantic.chunks[g+"_chunks"] = {techniques:{common:{binding:g+"_binding"}}};
      modelDescriptor.logic.parts[g+"_part"] = {chunks:[g+"_chunks"]};
    }
    this.callbacks.endParsing(modelDescriptor);
  }
  ,
  getGroup: function(groupName) {
    var Group = function(parserObj) {
        this.positionsStride = 3;
        this.txtcoordsStride = 3;
        this.normalsStride = 3;
        this.positionsArray=[];
        this.txtcoordsArray=[];
        this.normalsArray=[];
        this.indicesArray=[];
        this.map = [];
        this.vertexData = parserObj.vertexData;
        this.usingTextureCoordinates = false;
        this.usingNormals = false;
    }
    Group.prototype  = {
      addFace:function(v1,v2,v3){
        this.indicesArray.push(
          this.getVertex.apply(this,v1),
          this.getVertex.apply(this,v2),
          this.getVertex.apply(this,v3));
      },
      getVertex:function(v,vt,vn){
        v = v | 0;
        vt = vt | 0;
        vn = vn | 0;

        if ( undefined === this.map[v]) this.map[v] = {}; 
        if ( undefined === this.map[v][vt]) this.map[v][vt] = {}; 
        if ( undefined === this.map[v][vt][vn]) {
          var positions = this.vertexData.positions;
          var txtcoords = this.vertexData.txtcoords;
          var normals = this.vertexData.normals;
          var idx = ( (this.positionsArray.length + this.positionsStride - 1) / this.positionsStride ) | 0; 
          var posIdx = idx;
          var txtIdx = idx;
          var nrmIdx = idx;
          //var posIdx = ( (positionsArray.length() + this.positionsStride - 1) / this.positionsStride ) | 0  + 1;
          //var txtIdx = ( (txtcoordsArray.length() + this.txtcoordsStride - 1) / this.txtcoordsStride ) | 0  + 1;
          //var nrmIdx = ( (normalsArray.length() + this.normalsStride - 1) / this.normalsStride ) | 0  + 1;
          if ((v * 3 + 2) < positions.length) {
            this.positionsArray[posIdx * this.positionsStride + 0] = positions[v*3+0];
            this.positionsArray[posIdx * this.positionsStride + 1] = positions[v*3+1];
            this.positionsArray[posIdx * this.positionsStride + 2] = positions[v*3+2];
          } else throw "no!";

          if (vt >=0 && (vt * 3 + 2) < txtcoords.length) {
            this.txtcoordsArray[txtIdx * this.txtcoordsStride + 0] = txtcoords[v*3+0];
            this.txtcoordsArray[txtIdx * this.txtcoordsStride + 1] = txtcoords[v*3+1];
            this.txtcoordsArray[txtIdx * this.txtcoordsStride + 2] = txtcoords[v*3+2];
            this.usingTextureCoordinates = true;
          } else {
            this.txtcoordsArray[txtIdx * this.txtcoordsStride + 0] = 0.0;
            this.txtcoordsArray[txtIdx * this.txtcoordsStride + 1] = 0.0;
            this.txtcoordsArray[txtIdx * this.txtcoordsStride + 2] = 0.0;
          }


          if (vn >=0 && (vn * 3 + 2) < normals.length) {
            this.normalsArray[nrmIdx * this.normalsStride + 0] = normals[v*3+0];
            this.normalsArray[nrmIdx * this.normalsStride + 1] = normals[v*3+1];
            this.normalsArray[nrmIdx * this.normalsStride + 2] = normals[v*3+2];
            this.usingTextureCoordinates = true;
          } else {
            this.normalsArray[nrmIdx * this.normalsStride + 0] = 0.0;
            this.normalsArray[nrmIdx * this.normalsStride + 1] = 0.0;
            this.normalsArray[nrmIdx * this.normalsStride + 2] = 0.0;
          }

          this.map[v][vt][vn] = idx;
        }
        return this.map[v][vt][vn] | 0;
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
      this.vertexData.txtcoords.push(x,y,z);
      this.vertexData.usesTxtCoords = true;
    }
    var parseNormals = function(_x,_y,_z) {
      var x = parseFloat(_x);
      var y = parseFloat(_y);
      var z = parseFloat(_z);
      this.vertexData.positions.push(x,y,z);
      this.vertexData.usesNormals = true;
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
      case "usemtl":
      case "s":
    }
  }
}
