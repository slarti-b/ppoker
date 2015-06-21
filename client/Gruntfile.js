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
		dev: {
			options: {
				sourceMap: true
			},
			src: ['js/*.js'],
			dest: '<%= pkg.name %>.js'
		},
		dev: {
			options: {
				sourceMap: false
			},
			src: ['js/*.js'],
			dest: '<%= pkg.name %>.js'
		}
	},

	/* WATCH: grunt-contrib-watch */
	watch: {
		sass: {
			files: ['<%= pkg.name %>.scss', 'scss/**/*.scss'],
			tasks: ['sass:dev']
		},
		concat: {
			files: ['js/*.js'],
			tasks: ['concat:dev']
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

grunt.registerTask('default', ['sass:dev', 'concat:dev', 'watch']);
grunt.registerTask('prod', ['sass:prod', 'concat:prod']);

};
