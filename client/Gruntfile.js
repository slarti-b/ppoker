/**
 * Gruntfile.js
 */
module.exports = function(grunt) {
	grunt.initConfig({
	pkg: grunt.file.readJSON('package.json'),

	/* SASS: */
	sass: {
		dev: {
	        options: {
	            sourceMap: true,
	            quiet: true
	        },
			files: {
				'dist/<%= pkg.name %>.css': 'scss/<%= pkg.name %>.scss'
			}
		},
		
        prod: {
			options: {
				sourceMap: false,
				outputStyle: 'compressed'
			},
			files: {
				'dist/<%= pkg.name %>.css': 'scss/<%= pkg.name %>.scss'
			}
		}
	},
	copy:{
		main:{
			files:[
				{
					expand: true,
					mode: true,
					timestmap: true,
					src: ['fonts/**', 'jslib/**', 'images/**'],
					dest: 'dist'
				}
			]
		}
	},
	includereplace: {
		dev: {
			options: {
				prefix: '// @@',
				globals: {
					is_dev: true,
					dummy: ''
				}
			},
			files: {
				'dist/poker.js': 'js/poker.js',
				'dist/index.html' : 'html/index.html'
			}
		},
		prod: {
			options: {
				prefix: '// @@',
				globals: {
					is_dev: false,
					dummy: ''
				},
				processIncludeContents: function(file_contents, params){
					"use strict";
					if( params.dev_only ){
						return '';
					} else {
						return file_contents;
					}
				}
			},
			files: {
				'dist/poker.js': 'js/poker.js',
				'dist/index.html' : 'html/index.html'
			}
		}
	},

	/* WATCH: grunt-contrib-watch */
	watch: {
		sass: {
			files: ['<%= pkg.name %>.scss', 'scss/**/*.scss'],
			tasks: ['sass:dev']
		},
		copy: {
			files: 	['fonts/**', 'jslib/**', 'images/**'],
			tasks: ['copy:main']
		},
		includereplace: {
			files: ['html/**/*.htm*', 'js/**/*.js'],
			tasks: ['includereplace:dev']
		},
		livereload: {
			options: {
				livereload: {
					port: 8090
				}
			},
			files: ['dist/<%= pkg.name %>.css']
		}
	}
});

grunt.loadNpmTasks('grunt-contrib-watch');
grunt.loadNpmTasks('grunt-sass');
grunt.loadNpmTasks('grunt-include-replace');
grunt.loadNpmTasks('grunt-contrib-copy');
grunt.registerTask('default', ['sass:dev', 'includereplace:dev', 'copy:main', 'watch']);
grunt.registerTask('build', ['sass:prod', 'includereplace:prod', 'copy:main']);

};
