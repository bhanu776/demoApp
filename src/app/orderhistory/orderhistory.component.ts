import { ElectronService } from 'ngx-electron';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-orderhistory',
  templateUrl: './orderhistory.component.html',
  styleUrls: ['./orderhistory.component.css']
})
export class OrderhistoryComponent implements OnInit {
  public takeaway:number=0;
  public dinein:number=0;
  public delivery:number=0;
  public total:number=0;
  public orderHistory:any;

  constructor(private _electronService:ElectronService) { }

  ngOnInit() {
     this.orderHistory = this._electronService.ipcRenderer.sendSync("todaysOrderHistory");
     this.orderHistory.forEach(histories => {
       if(histories.type == 1) this.dinein += histories.gtotal_price;
       if(histories.type == 2) this.takeaway += histories.gtotal_price;
       if(histories.type == 3) this.delivery += histories.gtotal_price;
     });
     this.total = this.takeaway+this.dinein+this.delivery;
  }

  reGenBill(id){
    this._electronService.ipcRenderer.sendSync("duplicateBill",id);
  }

}
