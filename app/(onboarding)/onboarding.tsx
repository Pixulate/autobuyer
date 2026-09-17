import { BrandLogo } from "@/components/ScreenHeader";
import { colors } from "@/constants/theme";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Page_1, Page_2, Page_3, Page_4 } from "./pages/info";

export default function Onboarding() {
  
  //States 
  const [currentPage, setCurrentPage] = useState(1)
  const pages = {
    1: <Page_1 setCurrentPage={setCurrentPage}/>,
    2: <Page_2 setCurrentPage={setCurrentPage} />,
    3: <Page_3 setCurrentPage={setCurrentPage} />,
    4: <Page_4 setCurrentPage={setCurrentPage}/>,
  }
  
  return (
    <View
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: colors.background,
        
        display: "flex",
        justifyContent: "center",
        alignItems:"center"
      }}
    >
      <SafeAreaView style={onboardingStyles.onboardingPage}>
        
        {/*Logo*/}
        <View style={{ width: "100%", marginBottom: 30, display:"flex", flexDirection:"row", justifyContent:"center", alignItems:"center"}}>
          <BrandLogo height={28} />
        </View>
        
        {
          pages[currentPage]
        }
        
      </SafeAreaView>
      
        

    </View>
  );
}



export const styles = StyleSheet.create({

})

export const onboardingStyles = StyleSheet.create({
  
  onboardingPage: {
    width: "100%",
    height: "100%",
    
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    
    padding: 20

    
  },
  
  footer: {
    width: "100%",
    height: 150,
    
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems:"center"
  },
  
  nextButton: {
    width: "100%",
    height: 58,
    
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    
    backgroundColor: colors.brand,
    borderRadius: 16
  },
  
  previewWindow: {
    width: "100%",
    
    borderRadius: 25,
    backgroundColor: colors.wash,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    
    overflow:"hidden"
  }
  
})