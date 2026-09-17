require "json"

package = JSON.parse(File.read(File.join(__dir__, "..", "package.json")))

Pod::Spec.new do |s|
  s.name           = "CallHandoff"
  s.version        = package["version"]
  s.summary        = "Hand off to the system in-call UI"
  s.description    = "Hand off to the system in-call UI"
  s.license        = "MIT"
  s.author         = "AutoQuest"
  s.homepage       = "https://github.com/expo/expo"
  s.platforms      = { :ios => "15.1" }
  s.source         = { git: "https://github.com/expo/expo.git" }
  s.static_framework = true
  s.source_files   = "**/*.{h,m,mm,swift,hpp,cpp}"
  s.dependency "ExpoModulesCore"
  s.swift_version  = "5.9"
end
