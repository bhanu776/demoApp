import { Component, OnInit, ViewChild, ElementRef, Renderer } from '@angular/core';
import { ElectronService } from "ngx-electron";
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit{
  public runningTData;
  public takeawayData;
  public deliveryData;
  public todaysHistory;

  @ViewChild('runningTable') runningTable:ElementRef
  @ViewChild('todaysTakeaway') todaysTakeaway:ElementRef
  
  constructor(private _electronService:ElectronService,private _renderer:Renderer){
    setInterval(() => {
      this.runningTData = this._electronService.ipcRenderer.sendSync("getRunningTables");
      this.takeawayData = this._electronService.ipcRenderer.sendSync("todaysOtherOrder",2);
      this.deliveryData = this._electronService.ipcRenderer.sendSync("todaysOtherOrder",3);
      this.todaysHistory = this._electronService.ipcRenderer.sendSync("todaysOtherOrder",1);
      }, 1000);
     
  }

  ngOnInit(){
    
  }
  
}
