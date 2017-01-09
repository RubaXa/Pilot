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
					instrumentedFiles: 'temp/',
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
						'Emitter': 'vendors/Emitter'
					},
					out: 'Pilot.js',
					optimize: 'none',
					wrap: {
						start: '(function (define) {',

						end: `})((function () {
							var defined = {};
							var _define = function (name, deps, callback) {
								var i = deps.length, depName;

								while (i--) {
									depName = name.split('/').slice(0, -1).join('/');
									deps[i] = defined[deps[i].replace('./', depName ? depName + '/' : '')];
								}

								if (name === 'src/pilot.js') {
									define([], function () {
										return callback.apply(null, deps);
									});
								} else {
									defined[name] = callback.apply(null, deps);
								}
							};
							_define.amd = true;
							return _define;
						})());
						`
					}
				}
			}
		}
	});


	grunt.loadNpmTasks('grunt-version');
	grunt.loadNpmTasks('grunt-qunit-istanbul');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-requirejs');


	// Тестирование
	grunt.registerTask('test', ['qunit']);

	// Сборка
	grunt.registerTask('build', ['requirejs']);

	// Минификация
	grunt.registerTask('min', ['uglify']);

	// Default task.
	grunt.registerTask('default', ['version', 'test', 'build', 'min']);
};
