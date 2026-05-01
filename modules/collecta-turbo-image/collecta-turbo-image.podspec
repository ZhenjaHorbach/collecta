require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'collecta-turbo-image'
  s.version      = package['version']
  s.summary      = package['description']
  s.homepage     = 'https://github.com/ZhenjaHorbach/collecta'
  s.license      = 'MIT'
  s.author       = { 'Collecta' => 'noreply@collecta.app' }
  s.platforms    = { :ios => '15.1' }
  s.source       = { :git => '.' }
  s.source_files = 'ios/**/*.{h,m,mm,swift}'
  s.swift_version = '5.0'

  install_modules_dependencies(s)
end
