const {app, BrowserWindow, Menu, ipcMain,dialog} = require('electron')
const receipt = require('receipt');
const Printer = require('electron-printer');
const ntprinter = require('node-thermal-printer')

var knex = require("knex")({
	client: "sqlite3",
	connection: {
        filename: "./database.sqlite"
	}
});
getCurrentDate = ()=>{
var today = new Date();
var dd = today.getDate();

var mm = today.getMonth()+1; 
var yyyy = today.getFullYear();
if(dd<10) 
{
    dd='0'+dd;
} 

if(mm<10) 
{
    mm='0'+mm;
}
return dd+"/"+mm+"/"+yyyy;
}


/* ===============================================Receipt and Printer Operation===========================  */

T_B_ON = new Buffer([0x1b, 0x45, 0x01]);
T_B_OFF = new Buffer([0x1b, 0x45, 0x00]);
T_2HEIGHT = new Buffer([0x1b, 0x21, 0x10]);
T_NORMAL = new Buffer([0x1b, 0x21, 0x00]);
PAPER_FULL_CUT = new Buffer([0x1d, 0x56, 0x00]); // Full cut paper
PAPER_PART_CUT = new Buffer([0x1d, 0x56, 0x01]); // Partial cut paper
TXT_FONT_A = new Buffer([0x1b, 0x4d, 0x00]); // Font type A
TXT_FONT_B = new Buffer([0x1b, 0x4d, 0x01]); // Font type B
TXT_ALIGN_LT = new Buffer([0x1b, 0x61, 0x00]); // Left justification
TXT_ALIGN_CT = new Buffer([0x1b, 0x61, 0x01]); // Centering
TXT_ALIGN_RT = new Buffer([0x1b, 0x61, 0x02]); // Right justification
CHARCODE_USA = new Buffer([0x1b, 0x52, 0x00]); // USA
TXT_4SQUARE = new Buffer([0x1b, 0x21, 0x30]); // Quad area text
BEEP = new Buffer([0x1b, 0x1e]);

function Bold() {
    return BEEP+T_B_ON+TXT_FONT_B+"";
}
function Normal() {
    return T_B_OFF;
}

receipt.config.currency = '';
receipt.config.width = 45;
receipt.config.ruler = '-';

/* =========================================Prepare JSON Object=============== */
  function prepareItemFk(el,id){
    return item = {
      'item_id':el.item_id,
      'comment':el.comment,
      'name':el.item,
      'price':el.price,
      'total_price':el.total_price,
      'quantity':el.quantity,
      'order_history_id':id
    };
  }

  prepareUpdatedData=(historyData)=>{
    return updatedData = {
        "date":historyData.date,
        "cgst":historyData.cgst,
        "sgst":historyData.sgst,
        "total_quantity":historyData.total_quantity,
        "gtotal_price":historyData.gtotal_price,
        "discount_per":historyData.discount_per,
        "discount_rs":historyData.discount_rs,
        "container_charge":historyData.container_charge,
        "delivery_charge":historyData.delivery_charge,
        "customer_paid":historyData.customer_paid,
        "return_amount":historyData.return_amount
    }
  }

  testIfDataFroUpdate=(tableNo)=>{
    knex.from("table_order").select("history_id").where("table_no",tableNo)
    .then(result=>{console.log(result[0].history_id);return result[0].history_id;});
  }

  prepareUserDetail=(data)=>{
    return user = {
      'name':data.name,
      'address':data.address,
      'address1':data.address2,
      'mobile':data.mobile
    };
  }
  
  saveUserDetails=(user_detail)=>{
    knex.from('user_detail').select().where('mobile', '=', user_detail.mobile)
    .then(function(data){
        if(data.length>0){
          knex('user_detail').where('id', '=', data[0].id).update({
            'name':user_detail.name,
            'address':user_detail.address,
            'address1':user_detail.address1
          }).then(function(data){});
        }
        else{
          knex.insert(user_detail).into("user_detail").then(function(data){console.log(data)});
        }
    });
  }

  deleteDataFromOrderTable=(table_no)=>{
    knex('table_order').where('table_no',table_no).del()
    .then((data)=>console.log("data clear from table_order"));
  }

  deleteFromItemFK=(historyId)=>{
    knex('item_fk').where('order_history_id',historyId).del()
    .then((data)=>{console.log("data clear from Fk_items")});
  }

  transferDataIntoItem_Fk=(data,id)=>{
    let user_detail = prepareUserDetail(data[(data.length)-1]);
    data.forEach(el => {
        let item = prepareItemFk(el,id);
        knex.insert(item).into("item_fk")
        .then(function(data){
        });
    });
    if(data.table_no == ''){
      saveUserDetails(user_detail);
    }
    generateBill(id);
    deleteDataFromOrderTable(data[0].table_no);
  }

  ipcMain.on("addOrderHistory",function(event,history_data){  
      let history_id; 
      knex.from("table_order").select("history_id").where("table_no",history_data.table_no)
      .then(result=>{history_id = result[0].history_id;
        if(history_id!=null){
            knex("order_history").where("id",history_id).update(prepareUpdatedData(history_data))
            .then(result=>{
                deleteFromItemFK(history_id);
                knex.from('table_order').select().where('table_no', '=', history_data.table_no)
                .then(data=>{
                    transferDataIntoItem_Fk(data,history_id);
                });
                event.returnValue = "data is saved on id ="+history_id;
            });
        }
        else
            knex.insert(history_data).into("order_history")
            .then(id=>{
                knex.from('table_order').select().where('table_no', '=', history_data.table_no)
                .then(data=>{
                    transferDataIntoItem_Fk(data,id[0]);
                    deleteDataFromOrderTable(history_data.table_no);
                    
                });
                event.returnValue = "data is saved on id ="+id;
            });
        });
  });

  ipcMain.on("duplicateBill",(event,id)=>{
      generateBill(id);
    });

  function generateBill(id){
    knex.from('settings').select().where('id','=',1)
    .then((setting)=>{
        knex.from('order_history').select().where('id','=',id)
        .then(function(data){
            knex.from('item_fk').select().where('order_history_id',data[0].id)
            .then(function(itemData){
                status = printBill(data[0],itemData,setting[0]);
            });
        });
    });
  }

/* ===============================================Create Receipt For Bill and Print===========================  */
var type = {1:'DineIn',2:'Takeaway',3:'DineIn'};
function printBill(cal,items,setting){
    let message;
    let receiptItem = [];
    let mobile = "";
    let table = "";
    if(cal.type==3){
        mobile={ type: 'properties', lines: [
            {name: 'Mobile', value: cal.mobile },
            { name: 'Address', value: cal.address+" "+cal.address1}
        ]}
    }
    if(cal.type==1)
        table = "        Table No : "+cal.table_no;

    items.forEach((el,key) => {
        receiptItem.push({no: key, item: el.name, qty: el.quantity, cost: el.total_price});
    });
    const output = receipt.create([
    { type: 'text', value: [
        Bold()+'    '+setting.restro_name+Normal(),
                ''+setting.address,
                ''+setting.gstn,
                ''+setting.mobile
    ], align: 'center' },
    { type: 'empty' },
    { type: 'properties', lines: [
        { name: 'Order Id', value: cal.id},
        { name: 'Date', value: cal.date },
        { name: 'Type', value: type[cal.type]+" "+table}
    ] },
    { type: 'table', lines: receiptItem },
    { type: 'customTable',lines:[
        {ltext:'',lvalue:'Total',rtext: cal.total_quantity,rvalue: cal.gtotal_price},
        {ltext:'',lvalue:'CGST('+setting.cgst+')',rtext: '',rvalue: cal.cgst},
        {ltext:'',lvalue:'SGST('+setting.sgst+')',rtext: '',rvalue: cal.sgst},
        {ltext:'',lvalue:'SubTotal',rtext: '',rvalue: cal.sub_total}
    ]},
    { type: 'customRuler' },
    { type: 'customTable', lines: [
        {ltext:'',lvalue:'Amount Received',rtext: '',rvalue: cal.customer_paid},
        {ltext:'',lvalue:'Amount Returned',rtext: '',rvalue: cal.return_amount}
    ]},
    { type: 'customRuler' },
    mobile,
    { type: 'text', value: 'Final bits of text at the very base of a docket. This text wraps around as well!', align: 'center', padding: 5 },
    { type: 'text', value: ''+PAPER_PART_CUT}
]);

knex.from("settings").where('id',1).then(data=>{
    Printer.printDirect({
        data: output,
        printer: data[0].printer_bill,
        type: 'RAW',
        docname: 'Test',
        success: function (jobID) {
        message = 'sent to printer with ID: ' + jobID;
        },
        error: function (err) {
            message = err;
        }
    });
});
    return message;
}

/* ===============================================Create Receipt For Kot and Print===========================  */

ipcMain.on("printKot",function(event,table_no){
    knex.from('table_order').select().where('table_no', '=', table_no)
    .then(data=>{
        let kotdata = [];
        data.forEach((elem,key)=>{
            if(elem.kot == 0 && elem.total_kot<elem.quantity){
                if(elem.comment == '' || elem.comment==null){
                    kotdata.push({no: key, item: elem.item, comment: '----', qty: (elem.quantity-elem.total_kot)});
                }else{
                    kotdata.push({no: key, item: elem.item, comment: elem.comment, qty: (elem.quantity-elem.total_kot)});
            }
                updateKot(elem.id,1,elem.quantity);
            }
        });
        if(kotdata.length>0)
            event.returnValue = printKot(kotdata);
                else
                    event.returnValue = "kot already generated";
    });
});

function printKot(kotdata){
    let message;
    let printer;
    const output = receipt.create([
        {type:'text',value:Bold()},
        {type: 'text',value:'KOT',padding:10,align:'center'},
        {type: 'text',value: getCurrentDate(),padding:10,align:'center'},
        { type: 'customRuler'},
        { type: 'kot', lines: kotdata },
        { type: 'customRuler' },
        { type: 'text',value: PAPER_PART_CUT+''}
    ]);
    knex.from("settings").where('id',1).then(data=>{
        Printer.printDirect({
            data: output,
            printer: data[0].printer_kot,
            type: 'RAW',
            docname: 'Test',
            success: function (jobID) {
            message = 'sent to printer with ID: ' + jobID;
            },
            error: function (err) {
                message = err;
            }
        });
    });
    //console.log(output);
   return message+"working";
}

function updateKot(id,kot,tkot){
    knex('table_order').where('id', '=', id).update({'kot':kot,'total_kot':tkot})
    .on('query-error',function(error,obj){
      dialog.showMessageBox(error);
    })
    .then(function(data){
      console.log("kot data updated");
    });
  }

ipcMain.on("testPrinter",function(event){
    Printer.printDirect({
        data: output,
        printer: 'Two Pilots Demo Printer',
        type: 'RAW',
        docname: 'Test',
        success: function (jobID) {
            event.returnValue = 'sent to printer with ID: ' + jobID
        },
        error: function (err) {
            console.log(err)
        }
    });
  });

  ipcMain.on("getPrinters",event=> event.returnValue = Printer.getPrinters());

  


  /* ntprinter.init({
    type: 'star',                                     // Printer type: 'star' or 'epson'
    interface: '/dev/usb/lp0',                        // Printer interface
    characterSet: 'SLOVENIA',                         // Printer character set
    removeSpecialCharacters: false,                   // Removes special characters - default: false
    replaceSpecialCharacters: true                 // Adds additional special characters to those listed in the config files
  });
 ntprinter.print("hello world"); */

  