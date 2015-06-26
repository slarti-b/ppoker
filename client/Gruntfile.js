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
				'<%= pkg.name %>.css': 'scss/<%= pkg.name %>.scss'
			}
		},
		
        prod: {
			options: {
				sourceMap: false,
				outputStyle: 'compressed'
			},
			files: {
				'<%= pkg.name %>.css': 'scss/<%= pkg.name %>.scss'
			}
		}
	},

	concat: {
		dev_js: {
			options: {
				sourceMap: true
			},
			src: ['js/*.js'],
			dest: '<%= pkg.name %>.js'
		},
		prod_js: {
			options: {
				sourceMap: false
			},
			src: ['js/*.js'],
			dest: '<%= pkg.name %>.js'
		},
		dev_html: {
			options: {
				sourceMap: true
			},
			src: ['html/*.htm*'],   // *.htm* so both .html and .htm are used in dev
			dest: 'index.html'
		},
		prod_html: {
			options: {
				sourceMap: false
			},
			src: ['html/*.html'],   // *.html so only .html is used in prod
			dest: 'index.html'
		}
	},

	/* WATCH: grunt-contrib-watch */
	watch: {
		sass: {
			files: ['<%= pkg.name %>.scss', 'scss/**/*.scss'],
			tasks: ['sass:dev']
		},
		concat_js: {
			files: ['js/*.js'],
			tasks: ['concat:dev_js']
		},
		concat_html: {
			files: ['html/*.htm*'],
			tasks: ['concat:dev_html']
		},
		livereload: {
			options: {
				livereload: {
					port: 8090
				}
			},
			files: ['<%= pkg.name %>.css']
		}
	}
});

grunt.loadNpmTasks('grunt-contrib-watch');
grunt.loadNpmTasks('grunt-sass');
grunt.loadNpmTasks('grunt-contrib-concat');

grunt.registerTask('default', ['sass:dev', 'concat:dev_js', 'concat:dev_html', 'watch']);
grunt.registerTask('prod', ['sass:prod', 'concat:prod_js', 'concat:prod_html']);

};
