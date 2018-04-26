import { element } from 'protractor';
import { ElectronService } from 'ngx-electron';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer,SafeHtml } from '@angular/platform-browser';
import { Component, OnInit, ViewChild, ElementRef, Renderer,Input } from '@angular/core';
import { FormGroup, FormControl, Validators, FormBuilder, NgModel, NgForm } from '@angular/forms';
import { HotkeysService, Hotkey } from 'angular2-hotkeys';
import { DatePipe } from '@angular/common'
import { Observable } from 'rxjs/Observable'
import { NguiAutoCompleteComponent, NguiAutoComplete, NguiAutoCompleteDirective } from '@ngui/auto-complete';
import 'rxjs/add/observable/of';
import { ipcRenderer } from 'electron';
import { settings } from 'cluster';
import { parse } from 'path';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  
  constructor(private builder: FormBuilder, private _sanitizer: DomSanitizer,private route_perem:ActivatedRoute,
    private _electronService:ElectronService,private element:ElementRef,private strdate:DatePipe,
    private renderer:Renderer,private _hotkey:HotkeysService) {
      
      this._hotkey.add(new Hotkey(['f1'], (event: KeyboardEvent, combo: string): ExtendedKeyboardEvent => {
        console.log('Combo: ' + combo); // 'Combo: f1'
        this.bypassKot();
        //this.prepareDataForHistory()
        let e: ExtendedKeyboardEvent = event;
        e.returnValue = false; // Prevent bubbling
        return e;
      },['INPUT', 'SELECT', 'TEXTAREA']));
      this._hotkey.add(new Hotkey(['f2'], (event: KeyboardEvent, combo: string): ExtendedKeyboardEvent => {
        console.log('Combo: ' + combo); // 'Combo: f2'
        this.printKot();
        this.prepareDataForHistory();
        let e: ExtendedKeyboardEvent = event;
        e.returnValue = false; // Prevent bubbling
        return e;
      },['INPUT', 'SELECT', 'TEXTAREA']));
      this._hotkey.add(new Hotkey(['f6'], (event: KeyboardEvent, combo: string): ExtendedKeyboardEvent => {
        console.log('Combo: ' + combo); // 'Combo: f6'
        this.printKot();
        let e: ExtendedKeyboardEvent = event;
        e.returnValue = false; // Prevent bubbling
        return e;
      },['INPUT', 'SELECT', 'TEXTAREA']));
      
    }
 
  form;
  order;
  initProduct = [];
  initUserData = [];
  item_id:number;
  keyword:string;
  settings;
  /* =======================================DomElements================================================= */
  @ViewChild('table') tableER:ElementRef
  @ViewChild('itemFocus') itemINP:ElementRef
  @ViewChild('mobileDOM') mobileDOM:ElementRef
  @ViewChild("calculationForm")
  public cal_form:NgForm;
/* =========================================variables================================================== */
  total_quantity:number=0;
  gtotla_price:number=0;
  discount_per:number=0;
  discount_rs:number=0;
  total_discount:number=0;
  cgst:number=0;
  sgst:number=0;
  total_after_tax:number=0;
  container_charge:number=0;
  delivery_charge:number=0;
  total_aditional:number=0;
  customer_paid:number=0;
  return_amount:number=0;
  order_history_id:number=0;
  
  ngOnInit() {
    this.form = new FormGroup({
      type:new FormControl(""),
      table_no:new FormControl(""),
      mobile:new FormControl(""),
      name:new FormControl(""),
      address:new FormControl(""),
      address2:new FormControl(""),
      item_id:new FormControl(""),
      item:new FormControl(""),
      comment:new FormControl(""),
      quantity:new FormControl(""),
      price:new FormControl(""),
      total_price:new FormControl("")
    });    
    //this.prepareDataForDropDown();
    //here retrive data from setting table for calculating tax
    this.settings = this._electronService.ipcRenderer.sendSync("getSettings")[0];
    this.route_perem.params.subscribe(params=>{
    console.log(params.id+"/"+params.status);
    if(params.id === ' '){
        //this.focusOnDetails();
        this.getCurrentOrder("",true);
        this.getTotalPriceAndQuantity("");
    }else
    if(params.status === '1'){
      this.getCurrentOrder(params.id,true);
      this.getTotalPriceAndQuantity(params.id);
    }else
    if(params.status === '0'){
      this._electronService.ipcRenderer.send("getOrderHistoryById",params.id);
      this._electronService.ipcRenderer.on("refreshOrder",(event,table)=>{
        this.getCurrentOrder(table,true);
        this.getTotalPriceAndQuantity(table);
      });
    }
    });
    
   
  }

  

 /* ===========================================OnSubmit Actions=============================================== */

   onSubmit = function(order,e){
    let code = e.keyCode || e.which;
    order.kot = 0;
    if(!this.form.valid){
      return false;
    }
    if(code==13){
      e.preventDefault();
      if(this.settings.tax_type=='inclusive'){
        order.price = order.price - (order.price*((this.settings.cgst+this.settings.sgst)/100));
        order.total_price = order.price * order.quantity;
      }     
      let result = this._electronService.ipcRenderer.sendSync('saveOrder',order);
      this.clearDataFromDisplay(order);
      this.getCurrentOrder(order.table_no,false);
      this.getTotalPriceAndQuantity(order.table_no);
      this.changeFoculeToDefault();
    }
   }

/* ===========================================Delete Data Actions=============================================== */
  deleteData = function(id,table_no){
    let data = this._electronService.ipcRenderer.sendSync('deleteCurrentTableOrder',id);
    this.getCurrentOrder(table_no,false);
    this.getTotalPriceAndQuantity(table_no);
  }
/* ================================================Retrive Data From Database Table =============================*/

  getCurrentOrder(table_no,needUp){
    let tableOrder = this._electronService.ipcRenderer.sendSync('getOrderAccTable',table_no);
    console.log(tableOrder);
    if(tableOrder.length>0){
      if(tableOrder[tableOrder.length-1].type == 1){
        this.enableTable();
        this.changeFoculeOnTable();
        this.form.removeControl('table_no');
        this.form.addControl('table_no',new FormControl("",Validators.required));
        this.form.get('table_no').setValue(tableOrder[tableOrder.length-1].table_no);
      }else{
        this.disableTable();
        //this.focusOnDetails();
        this.form.removeControl('table_no');
        this.form.addControl('table_no',new FormControl(""));
      }
      if(needUp){
          this.form.get('type').setValue(''+tableOrder[tableOrder.length-1].type);
          this.form.get('mobile').setValue(tableOrder[tableOrder.length-1].mobile);
          this.form.get('name').setValue(tableOrder[tableOrder.length-1].name);
          this.form.get('address').setValue(tableOrder[tableOrder.length-1].address);
          this.form.get('address2').setValue(tableOrder[tableOrder.length-1].address2);
      }
    }
    else{
      this.clearAllDataFromDisplay();
      this.form.removeControl('table_no');
      this.form.addControl('table_no',new FormControl(""));
    }
    this.order = tableOrder;
  }

  getTotalPriceAndQuantity(table_no){
    let data = this._electronService.ipcRenderer.sendSync('totalPriceNdQuantity',table_no);
    this.total_quantity = data[0].tquantity;
    this.gtotla_price = data[0].gtprice;
    this.total_discount = this.gtotla_price;
    this.calculateTax();
    this.total_aditional = this.total_after_tax;
  }

  round(val){
    return Math.round(val);
  }

  roundUpToTwoPoint(val){
    return Math.round(val*100)/100;
  }

/* =======================================Clear data From Display===================================== */

clearDataFromDisplay(data){
  this.form.get('type').setValue(''+data.type);
  this.form.get('table_no').setValue(data.table_no);
  this.form.get('mobile').setValue(data.mobile);
  this.form.get('name').setValue(data.name);
  this.form.get('address').setValue(data.address);
  this.form.get('address2').setValue(data.address2);
  this.form.get('item').setValue('');
  this.form.get('comment').setValue('');
  this.form.get('quantity').setValue('');
  this.form.get('price').setValue('');
  this.form.get('total_price').setValue('');
 }

/* ======Retrive Data From History Table And Put Into Order Table And Then Update History Table Back=================== */

/* ========================================Calculate final amount Events=============================================== */

//calculate tax
  calculateTax = ()=>{
    this.cgst = parseFloat((this.total_discount*(this.settings.cgst/100)).toFixed(2));
    this.sgst = parseFloat((this.total_discount*(this.settings.sgst/100)).toFixed(2));
    this.total_after_tax = this.round(this.total_discount+this.cgst+this.sgst);
  }
  
  calculateDiscPer = function(value:number){
    this.discount_per = (this.gtotla_price * value)/100;
    this.total_discount = this.round(this.gtotla_price-(this.discount_per+this.discount_rs));
    this.calculateTax();
    this.total_aditional =  this.round(this.total_after_tax+this.container_charge+this.delivery_charge);    
  }

  calculateDiscRs = function(value:number){
    this.discount_rs = value;
    this.total_discount =  this.round(this.gtotla_price-(this.discount_per+this.discount_rs));
    this.calculateTax();
    this.total_aditional =  this.round(this.total_after_tax+this.container_charge+this.delivery_charge);
  }

  calculateContaiCharge(value){
    if(value != ''){
    this.container_charge = value;
    this.total_aditional =  this.round(this.total_after_tax+this.container_charge+this.delivery_charge);
    }
  }

  calculateDelivCharge(value:number){
    this.delivery_charge = value;
    this.total_aditional =  this.round(this.total_after_tax+this.container_charge+this.delivery_charge);
  }

  calculateReturn(value){
    this.customer_paid = value;
    this.return_amount = this.customer_paid - this.total_aditional;
  }

/* ========================================Events on type and table no=============================================== */

  dineInSelect = function(e){
    this.enableTable();
    this.changeFoculeOnTable();
    this.formSetupForDineIn();
  }

  otherSelect = function(e){
    this.focusOnDetails();
    this.disableTable();
    this.formSetupForOtherOrder();
  }

  tableSelected = function(e){
    let code = e.keyCode || e.which;
    if(code==13)
    this.changeFoculeToDefault()
  }

  getRunningOrder = table=>{
      this.getCurrentOrder(table,false);
      this.getTotalPriceAndQuantity(table);
    
  }

  gotoItems = function(e){
    let code = e.keyCode || e.which;
    if(code==13)
    this.changeFoculeToDefault()
  }

  calculatePriceAccQuant = function(quantity){
    let price = this.form.value.price;
    this.form.get('total_price').setValue(price*quantity);
  }

  
/* ===========================================Change Focus Acc to Type and Submition========================== */
  
   changeFoculeOnTable(){
    this.tableER.nativeElement.focus();
   }

   disableTable(){
    this.renderer.setElementAttribute(this.tableER.nativeElement,'disabled','true');
   }
   enableTable(){
    this.renderer.setElementAttribute(this.tableER.nativeElement,'disabled',null);
   }

   focusOnDetails(){
    this.mobileDOM.nativeElement.focus();
   }
  
   changeFoculeToDefault(){
      this.itemINP.nativeElement.focus();
   }

/* =======================================Clear data From Display===================================== */
formSetupForDineIn(){
  console.log(this.form);
  this.form.controls.table_no.status = "INVALID";
  this.form.get('mobile').setValue("");
  this.form.get('name').setValue("");
  this.form.get('address').setValue("");
  this.form.get('address2').setValue("");
}

formSetupForOtherOrder(){
  this.form.get('table_no').setValue('');
  this.form.controls.table_no.status = "VALID";
  this.form.get('mobile').setValue("");
  this.form.get('name').setValue("");
  this.form.get('address').setValue("");
  this.form.get('address2').setValue("");
 /*  let data = this._electronService.ipcRenderer.sendSync('eraseOrder','');
  console.log(data); */
}


/* ==========================================AutoComplete for Item============================================ */

autocompleListFormatter = (data: any) : SafeHtml => {
  let html = `<span>${data.sortname +" "+ data.name}</span>`;
  return this._sanitizer.bypassSecurityTrustHtml(html);
}


observableSource = (keyword: any): Observable<any[]> => {
  if (keyword) {
   return Observable.of(this.prepareDataForDropDown(keyword));
  } else {
    return Observable.of([]);
  }
}

valueChanged = newVal=>{
  let price = newVal.price;
   let quantity = 1;
     this.form.get('item_id').setValue(newVal.id);
     this.form.get('item').setValue(newVal.name);
     this.form.get('quantity').setValue(quantity);
     this.form.get('price').setValue(price);
     this.form.get('total_price').setValue(price*quantity);  

}

changeFoToComment = (e)=>{
  let code = e.keyCode || e.which;
  if(code==13)
  this.itemINP.nativeElement.parentNode.parentNode.nextElementSibling.children[0].focus();
}

prepareDataForDropDown(key){
  this.initProduct = [];
  let data = this._electronService.ipcRenderer.sendSync('searchProduct',key);
  data.forEach(element => {
  this.item_id = element.id;
  this.initProduct.push({
                  'id':element.id,
                  'sortname':element.sortname,
                  'name':element.item,
                  'price':element.price
                  });
  });
 return this.initProduct;
}
/* ==========================================AutoComplete for UserDetail=================================== */

userDetailFormatter = (data: any) : SafeHtml => {
  let html = `<span>${data.mobile +" "+ data.address}</span>`;
  return this._sanitizer.bypassSecurityTrustHtml(html);
}

getUserDetails = (keyword: any): Observable<any[]> => {
  if (keyword) {
   return Observable.of(this.searchMobile(keyword));
  } else {
    return Observable.of([]);
  }
}

changeFoToItem=(e)=>{
  let code = e.keyCode || e.which;
  if(code==13)
  this.changeFoculeToDefault();
}

onSelectPhone = newVal=>{
  let price = newVal.price;
   let quantity = 1;
     this.form.get('mobile').setValue(newVal.mobile);
     this.form.get('name').setValue(newVal.name);
     this.form.get('address').setValue(newVal.address);
     this.form.get('address2').setValue(newVal.address2); 

}

searchMobile(key){
  this.initUserData = [];
  let data = this._electronService.ipcRenderer.sendSync('searchMobile',key);
  data.forEach(elem => {
    this.initUserData.push({
      'id':elem.id,
      'mobile':elem.mobile,
      'name':elem.name,
      'address':elem.address,
      'address2':elem.address1
    });
  });
  return this.initUserData;
}

/* ===========================================OrderHistory And Print Related=============================== */
history_data;
prepareDataForHistory(){
this.history_data = {
  "date": this.strdate.transform(new Date(),'dd-MM-yyyy'),
  "cgst":this.cgst,
  "sgst":this.sgst,
  "table_no":this.form.get('table_no').value,
  "type":this.form.get('type').value,
  "total_quantity":this.total_quantity,
  "name":this.form.get('name').value,
  "address":this.form.get('address').value,
  "address1":this.form.get('address2').value,
  "mobile":this.form.get('mobile').value,
  "gtotal_price":this.gtotla_price,
  "sub_total":this.total_aditional,
  "discount_per":this.discount_per,
  "discount_rs":this.discount_rs,
  "container_charge":this.container_charge,
  "delivery_charge":this.delivery_charge,
  "customer_paid":this.customer_paid,
  "return_amount":this.return_amount
}

let id = this._electronService.ipcRenderer.sendSync('addOrderHistory',this.history_data);
this.clearAllDataFromDisplay();
}

printKot(){
  let table_no = this.form.get('table_no').value;
  let message = this._electronService.ipcRenderer.sendSync('printKot',table_no);
}

bypassKot(){
  let table_no = this.form.get('table_no').value;
  let id = this._electronService.ipcRenderer.sendSync('bypassKot',table_no);
  this.form.reset();
  this.cal_form.reset();
  this.total_quantity = 0;
  this.gtotla_price = 0
}

/* =========================================clear whole screen============================================ */

clearAllDataFromDisplay = ()=>{
  this.form.reset();
  this.order = [];
  this.total_quantity=0;
  this.gtotla_price=0;
  this.discount_per=0;
  this.discount_rs=0;
  this.total_discount=0;
  this.cgst=0;
  this.sgst=0;
  this.total_after_tax=0;
  this.container_charge=0;
  this.delivery_charge=0;
  this.total_aditional=0;
  this.customer_paid=0;
  this.return_amount=0;
  this.order_history_id=0;
}

}
