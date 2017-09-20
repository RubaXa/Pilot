'use strict';

module.exports = function (grunt) {
	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		jshint: {
			all: ['src/*.js', 'tests/*.tests.js']
		},

		version: {
			src: 'Pilot.js'
		},

		qunit: {
			all: ['tests/index.html'],
			options: {
				'--web-security': 'no',
				coverage: {
					src: ['<%=jshint.all%>'],
					instrumentedFiles: '/tmp/',
					htmlReport: 'report/coverage',
					coberturaReport: 'report/',
					linesThresholdPct: 80,
					functionsThresholdPct: 80,
					branchesThresholdPct: 70,
					statementsThresholdPct: 80
				}
			}
		},

		uglify: {
			options: {
				banner: '/*! Pilot <%= pkg.version %> - <%= pkg.license %> | <%= pkg.repository.url %> */\n'
			},
			dist: {
				files: {
					  'Pilot.min.js': ['Pilot.js']
				}
			}
		},

		requirejs: {
			compile: {
				options: {
					findNestedDependencies: true,
					baseUrl: './',
					include: 'src/pilot.js',
					paths: {
						'Emitter': 'empty:'
					},
					out: 'Pilot.js',
					optimize: 'none',
					wrap: {
						start: `(function (define, factory) {
							define(['Emitter'], function (Emitter) {
								var defined = {Emitter: Emitter};
								var syncDefine = function (name, deps, callback) {
									var i = deps.length, depName;
	
									while (i--) {
										depName = name.split('/').slice(0, -1).join('/');
										deps[i] = defined[deps[i].replace('./', depName ? depName + '/' : '')];
									}
	
									defined[name] = callback.apply(null, deps);
								};
								syncDefine.amd = true;
								factory(syncDefine);
								return defined['src/pilot.js'];
							});
						})(typeof define === 'function' && define.amd ? define : function (deps, callback) {
							window.Pilot = callback(window.Emitter);
						}, function (define) {`,

						end: `});`
					}
				}
			}
		}
	});


	grunt.loadNpmTasks('grunt-version');
	grunt.loadNpmTasks('grunt-qunit-istanbul');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-requirejs');


	// Тестирование
	grunt.registerTask('test', ['qunit']);

	// Сборка
	grunt.registerTask('build', ['requirejs']);

	// Минификация
	grunt.registerTask('min', ['uglify']);

	// Default task.
	grunt.registerTask('default', ['version', 'test', 'build', 'min']);
};
