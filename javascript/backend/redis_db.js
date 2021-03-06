/**
 * Author: Habib Naderi
 * Department of Computer Science, University of Auckland
 * 
 * This module contains a set of methods for accessing/manipulating team records in REDIS database. For more detailed
 * information about the structure of this DB, refer to 'database design' document. 
 */

module.exports = function (conn, db) {
	var utils = require("./utils.js")({rdb:conn, db:db});
	var lock = require('redis-lock')(conn);
	var logger = require('./logger')();
	utils.includeConstants('./javascript/backend/constants.js');	
	
	return {
		addParticipant: function(teamID, accessCode) {
			lock(teamID, function(done) {			
				conn.hgetall(teamID, function(err, reply) {
					if (err) {
						done();
						throw err;
					}
				
					if (reply) {
						reply.Participants = utils.addItemUnique(reply.Participants, accessCode);
						conn.hmset(teamID, reply, function(err, result) {
							done();
						});
					}
					else {
						logger.debug("no record for team " + teamID + ". create one ...");
						order = utils.getTestsOrder();
						if (RANDOMIZED_TEST_ORDER && teamID >= STARTING_ID_FOR_RANDOMIZATION) {
							order = [0].concat(utils.getNthPermutation(order.slice(1, order.length-1), teamID % utils.factorial(order.length-2))).concat([7]);
						}
						logger.debug("order: ", order);
						conn.hmset(teamID, "CurrentTest", PRAC_AREA, 
									   "CurrentScreen", INSTRUCTION_SCREEN,
									   "TextEditingUser", '',
									   "StartTime", 9999,
									   "TestTime", 0,
									   "IdeaId", 1,
									   "Participants", accessCode,
									   "ReadyToStart", '',
									   "PicConBGCreator", '',
									   "PicConBGImage", '', 
									   "DemoStopTimer", DEMO_TIMER_ACTIVE,
									   "TestsOrder", order,
									   function(err, result) {
											done();
						});
					}
				});
			});
		},
		
		delParticipant: function(teamID, accessCode) {
			lock(teamID, function(done){
				conn.hgetall(teamID, function(err, reply) {
					if (err) {
						done();
						throw err;
					}
				
					if (reply) {
						reply.Participants = utils.delItem(reply.Participants, accessCode);
						reply.ReadyToStart = utils.delItem(reply.ReadyToStart, accessCode);
						conn.hmset(teamID, reply, function (err, result) {
							done();
						});
					} else {
						logger.debug("no record for team ", teamID);
						done();
					}					
				});
			});
		},

		
		clearParticipants: function(teamID) {
			lock(teamID, function(done){
				conn.hgetall(teamID, function(err, reply) {
					if (err) { 
						done();
						throw err;
					}
				
					if (reply) {
						reply.Participants = '';
						conn.hmset(teamID, reply);
					}
					done();
				});
			});
		},

		getParticipants: function(teamID, callback, args) {
			lock(teamID, function(done){
				conn.hgetall(teamID, function(err, reply) {
					if (err) { 
						done();
						throw err;
					}
					
					done();
					
					if (reply) { 
						callback(reply.Participants == ''? [] : reply.Participants.split(','), args)
					}

				});
			});
		},
		

		addReadyParticipant: function(teamID, accessCode) {
			lock(teamID, function(done) {
				conn.hgetall(teamID, function(err, reply) {
					if (err) {
						done();
						throw err;
					}
				
					if (reply) {
						reply.ReadyToStart = utils.addItemUnique(reply.ReadyToStart, accessCode);
						reply.Participants = utils.addItemUnique(reply.Participants, accessCode);
						conn.hmset(teamID, reply);
					}
					done();
				});
			});
		},
		
		delReadyParticipant: function(teamID, accessCode) {
			lock(teamID, function(done){
				conn.hgetall(teamID, function(err, reply) {
					if (err) {
						done();
						throw err;
					}
				
					if (reply) {
						reply.ReadyToStart = utils.delItem(reply.ReadyToStart, accessCode);
						conn.hmset(teamID, reply);
					} else {
						logger.debug("no record for team ", teamID);
					}
					done();
				});
			});
		},
		
		
		checkReadyParticipants: function(teamID, callback, args) {
			lock(teamID, function(done) {
				conn.hgetall(teamID, function(err, reply) {
					if (err) {
						done();
						throw err;
					}
					
					done();
					
					if (reply) {
						callback(utils.isEqual(reply.Participants, reply.ReadyToStart), utils.getLength(reply.ReadyToStart), args);
					}

				});
			});			
		},
		
		clearReadyParticipants: function(teamID) {
			lock(teamID, function(done) {
				conn.hgetall(teamID, function(err, reply) {
					if (err) {
						done();
						throw err;
					}
				
					if (reply) {
						reply.ReadyToStart = '';
						conn.hmset(teamID, reply);
					}
					done();
				});
			});
		},
		
		setTextEditingUser: function(teamID, name, callback, args) {
			lock(teamID, function(done) {
				conn.hgetall(teamID, function(err, reply) {
					if (err) {
						done()
						throw err;
					}
				
					if (reply) {
						if (reply.TextEditingUser == '') {
							reply.TextEditingUser = name;
							conn.hmset(teamID, reply);
						}
						done();
						callback(reply.TextEditingUser);
					} else
						done();
				});
			});
		},
		
		clearTextEditingUser: function(teamID) {
			lock(teamID, function(done) {
				conn.hgetall(teamID, function(err, reply) {
					if (err) {
						done()
						throw err;
					}
				
					if (reply) {
						reply.TextEditingUser = '';
						conn.hmset(teamID, reply);
					}
					
					done();
				});
			});
		},
		
		getTextEditingUser: function(teamID, callback, args) {
			lock(teamID, function(done) {
				conn.hgetall(teamID, function(err, reply) {
					if (err) {
						done()
						throw err;
					}
				
					if (reply) {
						callback(reply.TextEditingUser, args);
					}
					done();
				});
			});
		},
		
		
		setIdeaID: function(teamID, ideaID) {
			lock(teamID, function(done) {
				conn.hgetall(teamID, function(err, reply) {
					if (err) {
						done();
						throw err;
					}
				
					if (reply) {
						reply.IdeaId = ideaID;
						conn.hmset(teamID, reply);
					}
					done();
				});
			});
		},
		
		getIdeaID: function(teamID, callback, args) {
			lock(teamID, function(done) {
				conn.hgetall(teamID, function(err, reply) {
					if (err) {
						done();
						throw err;
					}
				
					if (reply) {
						callback(reply.IdeaId, args);
					}
					done();
				});			
			});
		},

		genIdeaID: function(teamID, callback, args) {
			lock(teamID, function(done) {
				conn.hgetall(teamID, function(err, reply) {
					if (err) {
						done();
						throw err;
					}
				
					if (reply) {
						var id = reply.IdeaId ++;
						conn.hmset(teamID, reply, function(err, result) {
							done();
						});
						callback(id, args);
					} else 
						done();
				});
			});
		},
		
		setCurrentTest: function (teamID, testID) {
			lock(teamID, function(done) {
				conn.hgetall(teamID, function(err, reply) {
					if (err) {
						done();
						throw err;
					}
				
					if (reply) {
						reply.CurrentTest = testID;
						conn.hmset(teamID, reply);
					}
					done();
				});
			});
		},
		
		setCurrentScreen: function (teamID, screen) {
			lock(teamID, function(done) {
				conn.hgetall(teamID, function(err, reply) {
					if (err) {
						done();
						throw err;
					}
				
					if (reply) {
						reply.CurrentScreen = screen;
						conn.hmset(teamID, reply);
					}
					done();
				});
			});
		},
				
		getCurrentTest: function(teamID, callback, args) {
			lock(teamID, function(done) {
				conn.hgetall(teamID, function(err, reply) {
					if (err) {
						done();
						throw err;
					}
				
					done();

					if (reply) {
						callback(reply.CurrentTest, args);
					} else {
						callback(0, args);
					}
					
				});
			});
		},
		
		getCurrentScreen: function(teamID, callback, args) {
			lock(teamID, function(done) {
				conn.hgetall(teamID, function(err, reply) {
					if (err) {
						done();
						throw err;
					}
				
					done();
					
					if (reply) {
						callback(reply.CurrentScreen, args);
					} else {
						callback(1);
					}
				});
			});
		},
		
		updateTime: function (teamID, callback, args) {
			lock(teamID, function(done) {
				conn.hgetall(teamID, function(err, reply) {
					if (err) {
						done();
						throw err;
					}
				
					if (reply) {
						currentTime = new Date().getTime();
						if ((reply.StartTime != 9999) && (currentTime >= parseInt(reply.StartTime) + parseInt(reply.TestTime))) {
							reply.StartTime = 9999;
							reply.TestTime = 0;
							conn.hmset(teamID, reply);
							done();
							callback(args);
						} else
							done();
					} else
						done();
				});
			});
		},
		
		setTime: function(teamID, testTime) {
			lock(teamID, function(done) {
				conn.hgetall(teamID, function(err, reply) {
					if (err) {
						done();
						throw err;
					}
				
					if (reply) {
						reply.StartTime = new Date().getTime();
						reply.TestTime = testTime;
						conn.hmset(teamID, reply);
					}
					
					done();
				});
			});			
		},
		
		getTeam: function(teamID, callback, args) {
			lock(teamID, function(done) {
				conn.hgetall(teamID, function(err, reply) {
					if (err) {
						done();
						throw err;
					}
				
					done();
					
					callback(reply, args);					
				});
			});						
		},
		
		setTeam: function(teamID, setter, setter_args, callback, callback_args) {
			lock(teamID, function(done) {
				conn.hgetall(teamID, function(err, reply) {
					if (err) {
						done();
						throw err;
					}
				
					if (reply) {
						reply = setter(reply, setter_args);						
						conn.hmset(teamID, reply, function(err, res) {
							if (err) {
								done();
								throw err;
							}
							
							done();
							
							if (callback) 
								callback(reply, callback_args);							
						});
					} else					
						done();
				});
			});						
		},
		
		resetTeam: function(teamID) {
			lock(teamID, function(done) {
				conn.hgetall(teamID, function(err, reply) {
					if (err) {
						done();
						throw err;
					}
				
					logger.debug("resetting record for team " + teamID);
					
					var fs = require('fs');					
					if (reply.PicConBGImage != '' && fs.existsSync(PIC_CON_BGIMAGE_PATH+reply.PicConBGImage)) {
						fs.unlink(PIC_CON_BGIMAGE_PATH+reply.PicConBGImage);
					}
					
					conn.hmset(teamID, "CurrentTest", PRAC_AREA, 
									   "CurrentScreen", INSTRUCTION_SCREEN,
									   "TextEditingUser", '',
									   "StartTime", 9999,
									   "TestTime", 0,
									   "IdeaId", 1,
									   "Participants", '',
									   "ReadyToStart", '',
									   "PicConBGCreator", '',
									   "PicConBGImage", '', 
									   "DemoStopTimer", DEMO_TIMER_ACTIVE,
									   function(err, result) {
											done();
					});					
				});
			});						
		},
		
		
		setPicConBGCreator: function(teamID, accessCode, callback, args) {
			lock(teamID, function(done) {
				conn.hgetall(teamID, function(err, reply) {
					if (err) {
						done();
						throw err;
					}
					if (reply) {
						if (reply.PicConBGCreator == '') {
							reply.PicConBGCreator = accessCode;
							conn.hmset(teamID, reply);
						}
						
						done();
						
						callback(reply.PicConBGCreator, args);												
					} else
						done();						
				});
			});											
		},
		
		setPicConBGImage: function(teamID, value) {
			lock(teamID, function(done) {
				conn.hgetall(teamID, function(err, reply) {
					if (err) {
						done();
						throw err;
					}
					
					if (reply) {
						reply.PicConBGImage = value;
						conn.hmset(teamID, reply);
					}
					
					done();						
					
				});
			});														
		},
		
		verify: function(teamID, condition, callback, args) {
			lock(teamID, function(done) {
				conn.hgetall(teamID, function(err, reply) {
					if (err) {
						done();
						throw err;
					}
				
					done();
					
					var func = new Function('reply', "return " + condition);
					
					callback(func(reply), args);					
				});
			});									
		},
		
		waitFor: function(teamID, condition, callback, args) {
			waitForCondition(teamID, condition, callback, args);
		},

		waitFor2: function(teamID, verifier, verifierArgs, callback, callbackArgs) {
			waitForCondition2(teamID, verifier, verifierArgs, callback, callbackArgs);
		},
		
		delTeam: function(teamID) {
			lock(teamID, function(done) {
				conn.hgetall(teamID, function(err, reply) {
					if (err) {
						done();
						throw err;
					}
					if (reply) {
						var fs = require('fs');
						if (reply.PicConBGImage != '' && fs.existsSync(PIC_CON_BGIMAGE_PATH+reply.PicConBGImage)) {
							fs.unlink(PIC_CON_BGIMAGE_PATH+reply.PicConBGImage);
						}
						conn.del(teamID);
					}

					done();
				});
			});
		},
		
		getDemoStopTimer: function(teamID, callback, args) {
			lock(teamID, function(done) {
				conn.hgetall(teamID, function(err, reply) {
					if (err) {
						done();
						throw err;
					}
				
					done();
					
					callback(reply.DemoStopTimer, args);					
				});
			});									
		},
		
		setDemoStopTimer: function(teamID, value) {
			lock(teamID, function(done) {
				conn.hgetall(teamID, function(err, reply) {
					if (err) {
						done();
						throw err;
					}
				
					if (reply) {
						reply.DemoStopTimer = value;
						conn.hmset(teamID, reply);
					}
					
					done();
				});
			});			
		},	
		
		getTestsOrder: function(teamID, callback, args) {
			lock(teamID, function(done) {
				conn.hgetall(teamID, function(err, reply) {
					if (err) {
						done();
						throw err;
					}
				
					done();
					
					if (reply)
						callback(reply.TestsOrder.split(','), args);					
				});
			});												
		}
		
	};

	function waitForCondition(teamID, condition, callback, args) {
		lock(teamID, function(done) {
			conn.hgetall(teamID, function(err, reply) {
				if (err) {
					done();
					throw err;
				}
		
				done();
		
				var func = new Function('reply', "return " + condition);
				if (func(reply)) {
					callback(args);		
				}
				else {
					setTimeout(
					waitForCondition(teamID, condition, callback, args), 1000);
				}
			});
		});
	}

	function waitForCondition2(teamID, verifier, verifierArgs, callback, callbackArgs) {
		lock(teamID, function(done) {
			conn.hgetall(teamID, function(err, reply) {
				if (err) {
					done();
					throw err;
				}
		
				done();
		
				if (verifier(reply, verifierArgs)) {
					callback(callbackArgs);		
				}
				else {
					setTimeout(
					waitForCondition2(teamID, verifier, verifierArgs, callback, callbackArgs), 1000);
				}
			});
		});
	}
	

};