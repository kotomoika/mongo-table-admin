var servProps = ["_id", "updatedAt", "_updated_at", "createdAt", "_created_at"];

    swal({
      // title: "Mongo URL",
      html: "Please enter mongo url<div id='swal-div'> </div>",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      onOpen: function() {
        var swalDiv = document.querySelector("#swal-div");

        UI.input({
          parent: swalDiv,
          id: "db-path",
          placeholder: 'mongodb://localhost:27017/test',
          style: {
            fontSize: '100%',
            textAlign: "center"
          }
        });


        UI.input({
          parent: swalDiv,
          id: "collection",
          placeholder: 'collection',
          style: {
            fontSize: '100%',
            textAlign: "center"
          }
        });
    

        UI.button({
          parent: swalDiv,
          id: "table",
          innerHTML: 'Editable table',
          style: {
            fontSize: '120%',
            // textAlign: "center"
          }
        }, function() {
          formFindMongo("table");
        });
 

        UI.button({
          parent: swalDiv,
          id: "pivot",
          innerHTML: 'Pivot',
          style: {
            fontSize: '120%',
            // textAlign: "center"
          }
        }, function() {
          formFindMongo("pivot");
        });
      }
    });

    function formFindMongo(type) {

      swal.close();

      var dbPathDiv = document.querySelector("#db-path");

      var collectionDiv = document.querySelector("#collection");

      if (dbPathDiv && collectionDiv) {

        var params = {
          db: dbPathDiv.value,
          collection: collectionDiv.value,
          type: type
        };

        getDataMongo(params);
      }
    }


    function getDataMongo(params) {
      $.post("/find", params, function(arr) {

        console.log(arr);

        UI.span({
          parent: document.querySelector("#ace"),
          innerHTML: "query, updated on blur"
        });

        drawAce({
          parent: document.querySelector("#ace"),
          code: localStorage.queryCode || "{}",
          id: "ace-editor",
          height: "51px",
          onblur: function() {
            var code = aceEditor.getValue();
            localStorage.queryCode = code;

            try {
              var jsonCode = JSON.parse(code);
              params.query = code;
              getDataMongo(params);
            } catch (err) {
              alert(err);
            }
          }
        });

        if (params.type !== "table") {
          printPivot(arr);
        } else {
          printTable(arr, params);
        }
      });
    }

    function printTable(arr, params) {

      var container = document.getElementById('output');
      var ex = document.querySelector(".ht_master.handsontable");
      if(ex) {
        container.removeChild(ex);
      }

      arr = normalizeArrayOfObjects(arr);

      var columns = [];
      var colHeaders = [];

      var typesMap = {
        "Number": "numeric",
        "Boolean": "checkbox"
      };

      for (var key in arr[0]) {
        // if(servProps.indexOf(key) != -1) continue;
        var field = {
          data: key,
          jsType: typeof arr[0][key]
        };
          field.type =  typesMap[field.jsType];
        columns.push(field);
        colHeaders.push(key);
        if(key == "_id") field.readOnly = true;

      }

      var hot = new Handsontable(container, {
        data: arr,
        colHeaders: colHeaders,
        columns: columns,
        rowHeaders: false,
        autoColSize: true,
        contextMenu: false, //TODO: add row and remove row callbacks
        comments: false,
        afterChange: afterChange,
        // afterRemoveRow: afterRemoveRow
      });

      function afterChange(changes, src) {
        console.log(changes, src);

        if (!changes || !changes.length) return;
        var len = changes.length;
        var i = 0;
        next();

        function next() {
          var change = changes[i];
          var rowNum = change[0];
          var field = change[1];
          var oldValue = change[2];
          var newValue = change[3];
          var changed = (oldValue != newValue);
          var docId = arr[rowNum]["_id"];

          if (changed) {
            console.log(docId, field, newValue);
            params.query = JSON.stringify({"_id": docId});
            var update = {};
            update[field] = newValue;
            params.update = JSON.stringify({"$set": update}); 
            $.post("/update", params, function(obj) {
              console.log(obj); 
              cb();
            });          
          }
        }

        function cb() {
          i++;
          if (i < len) next();
          else {
            console.log("all saved");
          }
        }
      }

      function afterRemoveRow(rowNum, numRows) {
        var rowCount = this.countRows();

        console.log(rowNum, numRows, rowCount);
      }
    }

    function printPivot(arr) {

      arr = normalizeArrayOfObjects(arr);

      var renderers = $.extend(
        $.pivotUtilities.renderers,
        $.pivotUtilities.c3_renderers,
        $.pivotUtilities.d3_renderers,
        $.pivotUtilities.export_renderers);

      $("#output").pivotUI(arr, {
        renderers: renderers,
        // rows: rows,
        // cols: cols,
        // vals: ["value"],
        // rendererName: "Table",
        //rendererName: "Stacked Bar Chart",
        // aggregatorName: "Сумма целых",
      }, true, "ru");
    }


    function normalizeArrayOfObjects(arr, params) {
      if ((!arr) && (typeof(arr[0]) != "object")) {
        return;
      }

      params = params || {};
      params.showColumns = params.showColumns || [];
      params.hideColumns = params.hideColumns || [];

      var columns = [];
      var cell = "";
      var res = [];

      for (var i = 0; i < arr.length; i++) { //собираем все ключи со всех объектов, а не только с первого
        for (var key in arr[i]) {
          var showCols = (params.showColumns.length > 0) ? (params.showColumns.indexOf(key) > -1) : true;

          if ((columns.indexOf(key) == -1) && showCols && (params.hideColumns.indexOf(key) == -1)) columns.push(key);
        }
      }

      for (var n = 0; n < arr.length; n++) { //собираем данные полей, чистим
        var oneObj = arr[n];
        res[n] = {};
        for (var l = 0; l < columns.length; l++) {
          cell = oneObj[columns[l]];
          cell = ((cell && (cell !== null)) ? cell : "");
          if (typeof cell == "object") cell = JSON.stringify(cell);
          res[n][columns[l]] = cell;
        }
      }
      return res;
    }


    function drawAce(params) {

      params = params || {};

      if (typeof params == "string") params = {
        code: params,
      };

      params.parent = params.parent || document.body;
      params.id = params.id || "jsScript";
      params.width = params.width || "750px";
      params.height = params.height || "150px";
      params.fontSize = params.fontSize || "14px";
      params.marginTop = params.marginTop || "10px";
      params.marginBottom = params.marginBottom || "10px";

      var exAceDiv = document.querySelector("#" + params.id);
      if (exAceDiv) params.parent.removeChild(exAceDiv);

      var aceDiv = document.createElement("div");
      aceDiv.id = params.id;
      aceDiv.style.width = params.width;
      aceDiv.style.height = params.height;
      aceDiv.style.fontSize = params.fontSize;
      aceDiv.style.marginTop = params.marginTop;
      aceDiv.style.marginBottom = params.marginBottom;

      params.parent.appendChild(aceDiv);

      aceEditor = ace.edit(params.id);
      aceEditor.$blockScrolling = Infinity;
      aceEditor.setTheme("ace/theme/solarized_light");
      aceEditor.getSession().setMode("ace/mode/json");
      aceEditor.getSession().setUseWrapMode(true);
      aceEditor.setValue(params.code || '');
      aceEditor.gotoLine(2);

      aceEditor.on("blur", params.onblur);
    }