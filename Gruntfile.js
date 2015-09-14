'use strict';

module.exports = function (grunt){
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
					instrumentedFiles: 'temp/',
					htmlReport: 'report/coverage',
					coberturaReport: 'report/',
					linesThresholdPct: 99,
					functionsThresholdPct: 100,
					branchesThresholdPct: 90,
					statementsThresholdPct: 90
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
					'onModuleBundleComplete': function (data) {
						var fs = require('fs'),
							amdclean = require('amdclean'),
							outputFile = data.path;

						fs.writeFileSync(outputFile, amdclean.clean({
							'filePath': outputFile,
							'wrap': {
								start: ';define(["Emitter"], function(Emitter) {',
								end: '; return src_pilotjs;});'
							}
						}));
					}
				}
			}
		}
	});


	grunt.loadNpmTasks('grunt-version');
	//grunt.loadNpmTasks('grunt-babel');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-qunit-istanbul');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-requirejs');


	// Тестирование
	grunt.registerTask('test', ['jshint', 'qunit']);

	// Сборка
	grunt.registerTask('build', ['requirejs']);

	// Минификация
	grunt.registerTask('min', ['uglify']);

	// Default task.
	grunt.registerTask('default', ['version', 'test']);
};
