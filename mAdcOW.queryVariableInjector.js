///<reference path="typings/sharepoint/SharePoint.d.ts" /> 
///<reference path="typings/jquery/jquery.d.ts" /> 
/*

Author: Mikael Svenson - Puzzlepart 2016
Twitter: @mikaelsvenson

Description
-----------

Script which hooks into the query execution flow of a page using search web parts to inject custom query variables using JavaScript

The script requires jQuery to be loaded on the page, and then you can just attach this script on any page with script editor web part,
content editor web part, custom action or similar.


Usecase 1 - Static variables
----------------------------
Any variable which is persistant for the user across sessions should be loaded

<TODO: describe load of user variables>
<TODO: describe synonyms scenarios>

*/
"use strict";
var mAdcOW;
(function (mAdcOW) {
    var Search;
    (function (Search) {
        var VariableInjection;
        (function (VariableInjection) {
            var _loading = false;
            var _userDefinedVariables = {};
            var _synonymTable = {};
            var _dataProviders = [];
            var _origExecuteQuery = Microsoft.SharePoint.Client.Search.Query.SearchExecutor.prototype.executeQuery;
            var _origExecuteQueries = Microsoft.SharePoint.Client.Search.Query.SearchExecutor.prototype.executeQueries;
            // Function to load synonyms asynchronous - poor mans synonyms
            function loadSynonyms() {
                var d = jQuery.Deferred();
                //simulated logic to fetch and add synonyms - could be from a list
                setTimeout(function () {
                    _synonymTable['color'] = ['red', 'blue'];
                    _synonymTable['"cool guy"'] = ['"mikael svenson"'];
                    d.resolve();
                }, 2000);
                return d.promise();
            }
            // Function to inject synonyms at run-time
            function injectSynonyms(query, dataProvider) {
                // Remove complex query parts AND/OR/NOT/ANY/ALL/parenthasis/property queries/exclusions - can probably be improved            
                var cleanQuery = query.replace(/(-\w+)|(-"\w+.*?")|(-?\w+[:=<>]+\w+)|(-?\w+[:=<>]+".*?")|((\w+)?\(.*?\))|(AND)|(OR)|(NOT)/g, '');
                var queryParts = cleanQuery.match(/("[^"]+"|[^"\s]+)/g);
                var expansions = [];
                if (queryParts) {
                    for (var i = 0; i < queryParts.length; i++) {
                        if (_synonymTable[queryParts[i]]) {
                            expansions.push.apply(expansions, _synonymTable[queryParts[i]]);
                        }
                    }
                }
                if (expansions.length > 0) {
                    dataProvider.get_properties()["mAdcOWSynonyms"] = expansions;
                }
                else {
                    delete dataProvider.get_properties()["mAdcOWSynonyms"];
                }
            }
            // Sample function to load user variables asynchronous
            function loadUserVariables() {
                var d = jQuery.Deferred();
                SP.SOD.executeFunc('sp.js', 'SP.ClientContext', function () {
                    // Query user hidden list - not accessible via REST
                    // If you want TERM guid's you need to mix and match the use of UserProfileManager and TermStore and cache client side
                    var urlCurrentUser = _spPageContextInfo.siteAbsoluteUrl + "/_vti_bin/listdata.svc/UserInformationList?$filter=Id eq " + _spPageContextInfo.userId;
                    jQuery.getJSON(urlCurrentUser).done(function (data) {
                        var user = data['d']['results'][0];
                        for (var property in user) {
                            if (user.hasOwnProperty(property)) {
                                var val = user[property];
                                if (typeof val == "number") {
                                    console.log(property + " : " + val);
                                    _userDefinedVariables["mAdcOWUser." + property] = val;
                                }
                                else if (typeof val == "string") {
                                    console.log(property + " : " + val);
                                    _userDefinedVariables["mAdcOWUser." + property] = val.split(/[\s,]+/);
                                }
                            }
                        }
                        d.resolve();
                    }).fail(function (data, textStatus, error) {
                        console.error("getJSON failed, status: " + textStatus + ", error: " + error);
                        d.reject();
                    });
                });
                return d.promise();
            }
            // Function to inject custom variables on page load
            function injectCustomQueryVariables() {
                var queryGroups = Srch.ScriptApplicationManager.get_current().queryGroups;
                for (var group in queryGroups) {
                    if (queryGroups.hasOwnProperty(group)) {
                        var dataProvider = queryGroups[group].dataProvider;
                        var properties = dataProvider.get_properties();
                        // add all user variables fetched and stored as mAdcOWUser.
                        for (var prop in _userDefinedVariables) {
                            if (_userDefinedVariables.hasOwnProperty(prop)) {
                                properties[prop] = _userDefinedVariables[prop];
                            }
                        }
                        // add some custom variables for show
                        dataProvider.get_properties()["awesomeness"] = "WOOOOOOT";
                        dataProvider.get_properties()["moreawesomeness"] = ["foo", "bar"];
                        // set hook for query time variables which can change
                        dataProvider.add_queryIssuing(function (sender, e) {
                            // code which should modify the current query based on context for each new query
                            injectSynonyms(e.queryState.k, sender);
                        });
                        _dataProviders.push(dataProvider);
                    }
                }
            }
            function loadDataAndSearch() {
                if (!_loading) {
                    _loading = true;
                    // run all async code needed to pull in data for variables
                    jQuery.when(loadSynonyms(), loadUserVariables()).done(function () {
                        // set loaded data as custom query variables
                        injectCustomQueryVariables();
                        //reset to original function
                        Microsoft.SharePoint.Client.Search.Query.SearchExecutor.prototype.executeQuery = _origExecuteQuery;
                        Microsoft.SharePoint.Client.Search.Query.SearchExecutor.prototype.executeQueries = _origExecuteQueries;
                        //re-issue query for the search web parts
                        for (var i = 0; i < _dataProviders.length; i++) {
                            // complete the intercepted event
                            _dataProviders[i].raiseResultReadyEvent(new Srch.ResultEventArgs(_dataProviders[i].get_initialQueryState()));
                            //re-issue query
                            _dataProviders[i].issueQuery();
                        }
                    });
                }
            }
            // Loader function to hook in client side custom query variables
            function hookCustomQueryVariables() {
                console.log("Hooking variable injection");
                //TODO: Check if we have cached data, if so, no need to intercept for async web parts
                // Override both executeQuery and executeQueries
                Microsoft.SharePoint.Client.Search.Query.SearchExecutor.prototype.executeQuery = function (query) {
                    loadDataAndSearch();
                    return new SP.JsonObjectResult();
                };
                Microsoft.SharePoint.Client.Search.Query.SearchExecutor.prototype.executeQueries = function (queryIds, queries, handleExceptions) {
                    loadDataAndSearch();
                    return new SP.JsonObjectResult();
                };
            }
            ExecuteOrDelayUntilBodyLoaded(function () {
                Sys.Application.add_init(hookCustomQueryVariables);
            });
        })(VariableInjection = Search.VariableInjection || (Search.VariableInjection = {}));
    })(Search = mAdcOW.Search || (mAdcOW.Search = {}));
})(mAdcOW || (mAdcOW = {}));
