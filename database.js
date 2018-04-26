const {app, BrowserWindow, Menu, ipcMain,dialog} = require('electron')

var knex = require("knex")({
	client: "sqlite3",
	connection: {
		filename: "./database.sqlite"
	}
});

currentDate=()=>{
  var today = new Date();
  var dd = today.getDate();
  var mm = today.getMonth()+1; //January is 0!

  var yyyy = today.getFullYear();
  if(dd<10){
      dd='0'+dd;
  } 
  if(mm<10){
      mm='0'+mm;
  } 
  return dd+'-'+mm+'-'+yyyy;
}

ipcMain.on("saveOrder",function(event,table_order){
    //console.log(table_order);
    knex.from('table_order').select().where('table_no','=',table_order.table_no)
    .andWhere('item_id','=',table_order.item_id)
    .then(function(data){
      if(!data.length>0){                         ///if item is added first time then it will add
        knex.insert(table_order).into("table_order")
        .on('query-error', function(error, obj){
          dialog.showMessageBox(error);
        })
        .then(function (id) {
          event.returnValue = "data inserted and id = "+id;
        })
      }
      else{                                       ///else update only its price and quantity
        knex("table_order").where('id','=',data[0].id).update({
          'quantity':data[0].quantity+parseInt(table_order.quantity),
          'total_price':data[0].total_price+table_order.total_price,
          'kot':0
        })
        .on('query-error', function(error, obj){
          dialog.showMessageBox(error);
        })
        .then(function (id) {
          event.returnValue = "data Updated and id = "+id;
        })
      }
    });
   
  });

  ipcMain.on("getOrderAccTable",function(event,table_no){
    knex.from('table_order').select().where('table_no', '=', table_no)
    .on('query-error', function(error, obj){
      dialog.showMessageBox(error);
    })
    .then(function (data) {
      event.returnValue = data;
    })
  });

  ipcMain.on("getRunningTables",function(event){
    knex.select('table_no as table', knex.raw('SUM(total_price) as total')).from('table_order').where('table_no', '!=', '').groupByRaw('table_no')
    .on('query-error', function(error, obj){
      dialog.showMessageBox(error);
    })
    .then(function (data) {
      event.returnValue = data;
    });
  });


  ipcMain.on("getAnotherOrder",function(event){           //which is not table order
    knex.from('table_order').select().where('table_no', '=', '')
    .on('query-error', function(error, obj){
      dialog.showMessageBox(error);
    })
    .then(function (data) {
      event.returnValue = data;
    })
  });

  ipcMain.on("deleteCurrentTableOrder",function(event,id){
    knex('table_order').where('id',id).del()
    .on('query-error', function(error, obj){
      dialog.showMessageBox(error);
    })
    .then(function (data) {
      event.returnValue = "Delete "+data;
    });
  });

  ipcMain.on("eraseOrder",function(event,table_no){
    knex('table_order').where('table_no',table_no).del()
    .on('query-error', function(error, obj){
      dialog.showMessageBox(error);
    })
    .then(function (data) {
      event.returnValue = "Delete "+data;
    });
  });
 
  ipcMain.on("mainWindowLoaded", function(event){
    let result = knex.select("FirstName").from("User")
    result.then(function(rows){
      event.returnValue = rows;
    })
  });

  
  //Code Related To Product Table
  ipcMain.on("addProduct",function(event,product){
    knex.insert(product).into("product")
    .on('query-error', function(error, obj){
      dialog.showMessageBox(error);
    })
    .then(function (id) {
      event.returnValue = "data inserted and id = "+id;
    })
  });

  
  ipcMain.on("searchProduct",function(event,keyword){
    knex.from('product').select().where('sortname','Like',keyword+'%').limit(10)
    .on('query-error', function(error, obj){
      dialog.showMessageBox(error);
    })
    .then(function (data) {
      event.returnValue = data;
    });
  });

  ipcMain.on("searchMobile",(event,keyword)=>{
    knex.from("user_detail").select().where('mobile','Like',keyword+'%').limit(10)
    .on('query-error',(error,obj)=> dialog.showMessageBox(error))
    .then((data)=>event.returnValue = data)
  });

  ipcMain.on("totalPriceNdQuantity",function(event,table_no){
    knex('table_order').sum('quantity as tquantity').sum('total_price as gtprice').where('table_no', '=', table_no)
      .on('query-error', function(error, obj){
        dialog.showMessageBox(error);
      })
      .then(function (data) {
        event.returnValue = data;
      })
  });

  ipcMain.on("bypassKot",(event,table_no)=>{
    knex("table_order").where('table_no',table_no).update('kot',1).then(result=>event.returnValue=result);
  });

 
/* ====================================================== History ============================================== */  

  ipcMain.on("todaysOtherOrder",function(event,type){
    knex.from('order_history').select().where('type','=',type).andWhere('date',currentDate())
    .then(function(data){
      event.returnValue = data;
    });
  });

  ipcMain.on("todaysOrderHistory",function(event){
    knex.from('order_history').select().where('date',currentDate())
    .then(function(data){
      event.returnValue = data;
    });
  });
    
  ipcMain.on("getOrderHistoryById",function(event,id){
    knex.from('order_history').select().where('id','=',id)
    .then(function(history_data){
      knex.from('item_fk').select().where('order_history_id',history_data[0].id)
      .then(function(itemData){
        knex('table_order').where('table_no','').del().then(send=>{});
         itemData.forEach(items => {
            prepareDataForItems(items,history_data[0]);
         });
         event.sender.send("refreshOrder",'');
      });
    });
  });

  ipcMain.on("getOrderHistory",function(event){
    knex.from('order_history').select()
    .then(function(data){
      event.returnValue = data;
    });
  });

/* ====================================================== Configuration ============================================== */

ipcMain.on("setPrinter",(event,type,printer)=> knex('settings').where('id',1).update(type,printer).then(data=>event.returnValue = data));

ipcMain.on("getSettings",(event,type,printer)=> knex.from("settings").select().then(data=>event.returnValue = data));

ipcMain.on("setCgstPer",(event,cgst)=> knex('settings').where('id',1).update("cgst",cgst).then(data=>event.returnValue = data));

ipcMain.on("setSgstPer",(event,sgst)=> knex('settings').where('id',1).update("sgst",sgst).then(data=>event.returnValue = data));

ipcMain.on("setTaxType",(event,ttype)=> knex('settings').where('id',1).update("tax_type",ttype).then(data=>event.returnValue = data));

ipcMain.on("saveDetails",(event,name,mobile,gstn,address)=> knex('settings').where('id',1).update({
  "restro_name":name,
  "mobile":mobile,
  "gstn":gstn,
  "address":address
}).then(data=>event.returnValue = data));

ipcMain.on("getSettings",event=>knex.from("settings").select().where('id',1).then(data=>event.returnValue=data));


/* ============================================Prepare Objects======================================================= */

prepareDataForItems = (item,histData)=>{
  currentItem={
    "type":histData.type,
    "item_id":item.item_id,
    "item":item.name,
    "price":item.price/item.quantity,
    "quantity":item.quantity,
    "total_price":item.price,
    "address":histData.address,
    "table_no":'',
    "address2":histData.address1,
    "comment":item.comment,
    "mobile":histData.mobile,
    "name":histData.name,
    "kot":item.quantity,
    "total_kot":item.quantity,
    "history_id":item.order_history_id
  }
  knex.insert(currentItem).into("table_order").then(returndate=>{});
}