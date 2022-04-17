require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "TelinkSigMeshLib"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "10.0" }
  s.source       = { :git => "https://github.com/thanhtunguet/react-native-telink-ble.git", :tag => "#{s.version}" }

  s.exclude_files = "TelinkSigMeshLib/TelinkSigMeshLib/Third Library/", "TelinkSigMeshLib/TelinkSigMeshLibTests"
  s.source_files = "TelinkSigMeshLib/**/*.{h,m,mm,swift,pch}"

  s.prefix_header_file = "TelinkSigMeshLib/TelinkSigMeshLib/TelinkSigMeshLibPrefixHeader.pch"
  

  s.dependency "GMEllipticCurveCrypto" 
  s.dependency "OpenSSL-Universal"
  s.dependency "React-Core"

end
