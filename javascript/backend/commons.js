/**
 * New node file
 */

module.exports = function(context)
{
	var logger = require('./logger.js')(context);
	var utils = require('./utils.js')();
	utils.includeConstants('./javascript/backend/constants.js');
	
	return {
		sendTestStateRsp: function() {
			context.rdb.getTeam(context.session.TeamID, sendTestState);
		},
		
		sendSessionStateRsp: function() {
			context.channel.sendToUser(context.session.AccessCode, GET_SESSION_STATE_RSP, context.session);
		},
		
		sendTestComplete: function() {
	    	context.channel.sendToTeam(context.session.TeamID, TEST_COMPLETE_MSG);
		},

		sendGetResultsReq: function() {
	    	context.channel.sendToMinID(context.session.TeamID, GET_RESULTS_REQ);
		},
		
		setTestTime: function(time) {
	        context.rdb.setTime(context.session.TeamID, time);
		},
		
		sendBackendReadyMsg: function() {
	        context.channel.sendToUser(context.session.AccessCode, BACKEND_READY_MSG);
		},		
		
		sendIsBackendReadyRsp: function (rsp) {
			context.channel.sendToUser(context.session.AccessCode, IS_BACKEND_READY_RSP, rsp);
		},
				
		setupTestTime: function(testID, callback, args) {
			context.db.getTestTimeLimit(testID, setupTime, callback, args)	     
		},
		
		checkAllReady: function (op, testID, callback, args) {
			context.rdb.getCurrentScreen(context.session.TeamID, checkAllReadyRsp, {op:op, testID: testID, callback: callback, args:args});
		},
		
		checkEditTitle: function() {
			context.rdb.setTextEditingUser(context.session.TeamID, context.session.Name, editTitleRsp);
		},	
		
		saveTransaction: function(testID, data) {
			context.db.saveTransaction(context.session.TeamID, context.session.UserID, testID, data);
		},
		
		broadcastTransaction: function(msg, testID, data) {
        	data.userID = context.session.UserID;
        	context.channel.sendToTeam(context.session.TeamID, msg, data);	        	
		},
		
		saveAndBroadcastTransaction: function(msg, testID, data) {
        	this.saveTransaction(testID, data);
        	this.broadcastTransaction(msg, testID, data);	        				
		},
		
		sendTransactions: function(testID) {
			context.rdb.getCurrentScreen(context.session.TeamID, sendScreenTransactions, {testID: testID});
		},
		
		sendEndData: function() {
			context.channel.sendToUser(context.session.AccessCode, END_DATA_MSG);
		},
				
		disconnectUser: function () {
        	logger.debug('Got a disconnet message.');
			context.db.deactivateUser(context.session.TeamID, context.session.UserID);
			context.rdb.delParticipant(context.session.TeamID, context.session.AccessCode);
			context.rdb.delReadyParticipant(context.session.TeamID, context.session.AccessCode);
			context.channel.leaveTeam(context.session.AccessCode, context.session.TeamID);
			context.channel.disconnect(context.session.AccessCode);
			
			context.db.getActiveUsersCount();			
		},
		
		handleUpdateTitleMsg: function(title) {
        	context.channel.sendToTeam(context.session.TeamID, UPDATE_TITLE_MSG, title);
        	context.rdb.clearTextEditingUser(context.session.TeamID);			
		},

		sendInstructionFile: function() {
			context.rdb.getCurrentTest(context.session.TeamID, sendTestInstruction);
		},		
		
		sendIntroduction: function() {
			context.db.getIntroductionFile(sendIntroduction);
		},
		
		redirectToTest: function(testID) {
			context.channel.sendToTeam(context.session.TeamID, GOTO_MSG, utils.getInstructionURL(testID));
		}
		
	};
	
    function sendTestState(teamInfo) {
    	context.channel.sendToUser(context.session.AccessCode, GET_TEST_STATE_RSP, teamInfo);
    }
	
	function setupTime(time, callback, args) {
	    time = 10;
		logger.debug("time for this test is: ", time, " sec");
		context.rdb.setTime(context.session.TeamID, time*1000);
        setTimeout(function() {
        	context.rdb.updateTime(context.session.TeamID, callback, args);
        }, (time+1)*1000);        
	}
	
	function checkAllReadyRsp(currentScreen, args) {
		if (context.session.Late || (args.testID == PRAC_AREA && currentScreen > INSTRUCTION_SCREEN && args.op != START_TEST)) {
			context.channel.sendToUser(context.session.AccessCode, PERM_RSP, 
					{decision:GRANTED, operation:args.op});
			if (args.callback)
				args.callback(args.args);
		} else {
			context.rdb.addReadyParticipant(context.session.TeamID, context.session.AccessCode);
			context.rdb.checkReadyParticipants(context.session.TeamID, checkOtherParticipants, args);
		}
	}
	
	function checkOtherParticipants(allReady, len, args) {
		if (allReady && len >= 2) {
			context.channel.sendToTeam(context.session.TeamID, PERM_RSP, 
					{decision:GRANTED, operation:args.op});
			context.rdb.clearReadyParticipants(context.session.TeamID);
			context.rdb.setCurrentScreen(context.session.TeamID, 1);
			if (args.callback)
				args.callback(args.args)
		}
	}	        
	
	function editTitleRsp(name) {
		if (name != context.session.Name) {
			context.channel.sendToUser(context.session.AccessCode, PERM_RSP, 
					{decision:DECLINED, operation: EDIT_TITLE, info: name});
		} else {
			context.channel.sendToUser(context.session.AccessCode, PERM_RSP, 
					{decision:GRANTED, operation: EDIT_TITLE});
			context.channel.sendToTeam(context.session.TeamID, TITLE_BEING_EDITED_MSG, {editingUser: name});
		}
	}
	
	function sendScreenTransactions(currentScreen, args) {
		context.db.getTransactions(context.session.TeamID, args.testID, currentScreen, sendTransactions);
	}
	
    function sendTransactions(rows) {
        for(var i = 0; i<rows.length; i++) {
        	var oData = eval('(' + rows[i].OperationData + ')');
        	var drag = rows[i].Operation == 1 ? true : false;
        	var color = "rgba(0,0,0,1)";
        	if (drag) {
        		color = utils.getUserColor(rows[i].UserID);
        	}
        	//console.log("oData: ", oData, "operation:", rows[i].Operation, "drag:", drag, "color: ", color);                	
            context.channel.sendToUser(context.session.AccessCode, 'mousedot', {x:oData.x, y:oData.y, drag:drag, rad:oData.rad, colour:color, 
            		owner:'s'+rows[i].TeamID+'p'+rows[i].UserID, group:rows[i].TeamdID, screen:2});
        }	 
        this.sendEndData();
        
    }

    function sendTestInstruction(currentTest) {
		context.db.getTestInstructionFile(currentTest, sendFile, {msg:GET_TEST_INSTRUCTION_RSP});
    }
    
    function sendIntroduction() {
    	context.db.getIntroductionFile(sendFile, {msg:GET_INTRODUCTION_RSP});
    }
    
    function sendFile(fileName, args) {
    	var fs = require('fs');
    	
    	fs.readFile(fileName, function (err, data) {
    		if (err) throw err;
    		
    		context.channel.sendToUser(context.session.AccessCode, args.msg, data.toString());
    	});
    }

};