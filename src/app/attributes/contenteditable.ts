/**
 * Mimics [ng-model] functionality for [contenteditable].
 */

import {Attribute} from 'ng-decorate'
import {BaseVM} from 'utils/all'

@Attribute({
  moduleName: 'app',
  selector: '[contenteditable]',
  require: '?ngModel',
  // inject: ['$sce']
})
class VM extends BaseVM {
  // $sce: ng.ISCEService

  static link(scope: ng.IScope, $element, a, ngModel: ng.INgModelController) {
    if (!ngModel) return
    var element: HTMLElement = $element[0]

    // Specify how UI should be updated
    ngModel.$render = function() {
      element.innerText = ngModel.$viewValue
    }

    // Listen for change events to enable binding
    ['blur', 'keyup', 'change'].forEach(eventName => {
      element.addEventListener(eventName, () => {scope.$evalAsync(read)})
    })
    read()

    // Write data to the model
    function read() {
      ngModel.$setViewValue(element.innerText)
    }
  }
}
