import { element } from 'protractor';
import { DomSanitizer,SafeHtml } from '@angular/platform-browser'
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, FormArray, Validators } from '@angular/forms';
import { ElectronService } from 'ngx-electron'

@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.css']
})
export class ProductComponent implements OnInit {


constructor(private builder: FormBuilder, private _sanitizer: DomSanitizer,private _electronService:ElectronService) {  }

ngOnInit() {
 /*  let data = this._electronService.ipcRenderer.sendSync('testPrinter');
  console.log(data); */
}

 
}