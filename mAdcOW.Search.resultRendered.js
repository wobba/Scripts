/*
 Author: Mikael Svenson - @mikaelsvenson
 
 Usage:

 Add the script to your page in a script editor web part, content editor web part, reference in the master page, or as a custom action.
 The clue is that the script should be present and hooked up on the page before the first results are rendered.

*/
"use strict";
(function () {
    function hookScript() {
        var manager = Srch.ScriptApplicationManager.get_current();
        var defaultQueryGroup = manager.queryGroups["Default"];
        var searchControls = defaultQueryGroup.displays;

        for (var i = 0; i < searchControls.length; i++) {
            if (searchControls[i] instanceof Srch.Refinement) {
                // refinement web part
                searchControls[i].add_resultRendered(function (sender, e) {
                    var ctrl = sender; // the web part
                    var result = e.result;
                    var resultTables = result.ResultTables; // one table per refiner type
                    var queryTime = result.e.ElapsedTime; // query time in milliseconds
                    console.log('Rendering is complete and DOM available');
                });
                break;
            }
            if (searchControls[i] instanceof Srch.Result) {
                // search result web part
            }
        }
    }

    ExecuteOrDelayUntilBodyLoaded(function () {
        Sys.Application.add_init(hookScript);
    });
}());
