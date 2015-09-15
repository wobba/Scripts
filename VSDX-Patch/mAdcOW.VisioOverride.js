"use strict";
(function () {
    function registerVisioIcon() {
        ExecuteOrDelayUntilBodyLoaded(function () {
            SP.SOD.executeFunc("search.clientcontrols.js", "Srch.ScriptApplicationManager", function () {
                Srch.U.getFriendlyNameForFileExtensionOrig = Srch.U.getFriendlyNameForFileExtension;

                Srch.U.getFriendlyNameForFileExtension = function (fileExtension) {
                    if (!Srch.U.w(fileExtension)) {
                        if (fileExtension === 'vsdx' || fileExtension === 'vssx' || fileExtension === 'vstx' || fileExtension === 'vsdm' || fileExtension === 'vssm' || fileExtension === 'vstm') {
                            return 'file_Visio';
                        }
                    }
                    return Srch.U.getFriendlyNameForFileExtensionOrig(fileExtension)
                }
            });
        });
    }

    ExecuteOrDelayUntilBodyLoaded(function () {
        try {
            if (typeof (_spBodyOnLoadCalled) === 'undefined' || _spBodyOnLoadCalled) {
                // make sure we are called after the controls are initialized, but before rendered
                Sys.Application.add_init(registerVisioIcon);
                RegisterModuleInit(SP.Utilities.UrlBuilder.urlCombine(_spPageContextInfo.webServerRelativeUrl, 'SiteAssets/mAdcOW.VisioOverride.js'), registerVisioIcon);
            }
            else {
                // make sure we are called after the controls are initialized, but before rendered
                Sys.Application.add_init(registerVisioIcon);
            }
        } catch (e) { }
    });
}());
