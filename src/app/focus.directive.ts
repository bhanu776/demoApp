import { element } from 'protractor';

import { Directive, ElementRef, HostListener } from '@angular/core';
import { ViewChild } from '@angular/core';
import { Input } from '@angular/core';
import { Renderer } from '@angular/core';

@Directive({
  selector: '[appFocus]'
})
export class FocusDirective {

  constructor(private element:ElementRef,private renderer: Renderer ) {
  }

  @HostListener('keypress',['$event']) changeFocuse(e){
    let code = e.keyCode || e.which;
    if(code == 13)
    this.element.nativeElement.parentNode.nextElementSibling.children[0].focus();
  }

}

@Directive({
  selector:'[appFocusNext]'
})
export class FocusNextDirective{
  constructor(private element:ElementRef,private renderer: Renderer){
  }

  @HostListener('keypress',['$event']) changeFocuse(e){
    let code = e.keyCode || e.which;
    if(code==13)
    this.element.nativeElement.parentNode.parentNode.nextElementSibling.children[0].children[0].focus();
  }
}

