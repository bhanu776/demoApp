import { Component, OnInit, ElementRef, ViewChild,Renderer } from '@angular/core';
import { ElectronService } from 'ngx-electron';

@Component({
  selector: 'app-configuration',
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.css']
})
export class ConfigurationComponent implements OnInit {
  constructor(private _electronService: ElectronService,private _renderer:Renderer) {   
  }

  @ViewChild("printerArea")
  public printDiv:ElementRef
  @ViewChild("taxArea")
  public taxDiv:ElementRef
  @ViewChild("detailArea")
  public detailArea:ElementRef

  public printers:string[]=[];
  public kotPrinter:string;
  public billPrinter:string;
  public cgst:number;
  public sgst:number;
  public ttype:string;
  public name:string;
  public mobile:string;
  public gstn:string;
  public address:string;

  ngOnInit() {
  let getSettings = this._electronService.ipcRenderer.sendSync("getSettings")[0];
  this.kotPrinter = getSettings.printer_kot;
  this.billPrinter = getSettings.printer_bill;
  this.cgst = getSettings.cgst;
  this.sgst = getSettings.sgst;
  this.ttype = getSettings.tax_type;
  this.name = getSettings.restro_name;
  this.mobile = getSettings.mobile;
  this.gstn = getSettings.gstn;
  this.address = getSettings.address;

  let printers = this._electronService.ipcRenderer.sendSync("getPrinters");
  printers.forEach(elem => {
    this.printers.push(elem.name);
  });
  }

  setKotPrinter = (printer)=>console.log(this._electronService.ipcRenderer.sendSync("setPrinter","printer_kot",printer));
  setBillPrinter = (printer)=>console.log(this._electronService.ipcRenderer.sendSync("setPrinter","printer_bill",printer));


  saveCgstPre = ()=> console.log(this._electronService.ipcRenderer.sendSync("setCgstPer",this.cgst));
  saveSgstPre = ()=> console.log(this._electronService.ipcRenderer.sendSync("setSgstPer",this.sgst));

  saveTaxType = ()=> console.log(this._electronService.ipcRenderer.sendSync("setTaxType",this.ttype));

  saveDetails = ()=> console.log(this._electronService.ipcRenderer.sendSync("saveDetails",this.name,this.mobile,this.gstn,this.address));

  
  
  showPrinterDiv = ()=>{
    this._renderer.setElementStyle(this.printDiv.nativeElement,'display','block');
    this._renderer.setElementStyle(this.taxDiv.nativeElement,'display','none');
    this._renderer.setElementStyle(this.detailArea.nativeElement,'display','none');
  }

  showTaxDiv = ()=>{
    this._renderer.setElementStyle(this.taxDiv.nativeElement,'display','block');
    this._renderer.setElementStyle(this.printDiv.nativeElement,'display','none');
    this._renderer.setElementStyle(this.detailArea.nativeElement,'display','none');
  }

  showOtherDiv = ()=>{
    this._renderer.setElementStyle(this.detailArea.nativeElement,'display','block');
    this._renderer.setElementStyle(this.printDiv.nativeElement,'display','none');
    this._renderer.setElementStyle(this.taxDiv.nativeElement,'display','none');
  }

}