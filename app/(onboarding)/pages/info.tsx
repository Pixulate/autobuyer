//Imports 
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { onboardingStyles } from '../onboarding';
import { AnimatedEntryCard, InnerCircleAnimation, SpinningTextCircle } from '../animations';
import { colors } from "@/constants/theme";
import { globalStyles } from '@/app/_layout';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

export function Page_1({setCurrentPage})
{
  return (
    <>
      {/*Circle*/}
      <View style={styles.circleFrame}>
        
        <SpinningTextCircle />
        <InnerCircleAnimation />

        
        
      </View>

      {/*Footer*/}
      <View style={onboardingStyles.footer}>
        <TouchableOpacity style={onboardingStyles.nextButton} onPress={() => { setCurrentPage(2)}}>
          <Text style={[globalStyles.h3, {color:"white"}]}>
            Next
          </Text>
        </TouchableOpacity>
        
        <Text style={[globalStyles.h4, {fontSize: 15, textAlign:"center", marginTop: 15}]}>
          By proceeding to use Carloop, you agree to our
          <Text style={{color: colors.accent}}>
            {" terms of service "}
          </Text>
          and
          <Text style={{color: colors.accent}}>
             {" privacy policy "}
          </Text>
        </Text>
      </View>  
    </>
  )
}

export function Page_2({setCurrentPage})
{
  return (
    <>
      
      {/*Window*/}
      <View style={[onboardingStyles.previewWindow, { height: 320 }]}>
        <AnimatedEntryCard>        
          <Image
            source={require("@/assets/icons/onboarding/phoneframe.svg")}
            placeholder={"o"}
            style={{ width: 237, height: 538}}
          />
        </AnimatedEntryCard>
      </View>
      
      <View style={{width:"100%", flex: 1, display:"flex", justifyContent:"center", alignItems:"center"}}>      
        <Text style={[globalStyles.funnelExtraBold, {textAlign:"center", fontSize: 30}]}>
          {"Let local dealers know what you're looking for"}
        </Text>
      </View>
      
      {/*Footer*/}
      <View style={onboardingStyles.footer}>
        <TouchableOpacity style={onboardingStyles.nextButton} onPress={() => { setCurrentPage(3)}}>
          <Text style={[globalStyles.h3, {color:"white"}]}>
            Next
          </Text>
        </TouchableOpacity>
        
        <Text style={[globalStyles.h4, {fontSize: 15, textAlign:"center", marginTop: 15}]}>
          By proceeding to use Carloop, you agree to our
          <Text style={{color: colors.accent}}>
            {" terms of service "}
          </Text>
          and
          <Text style={{color: colors.accent}}>
             {" privacy policy "}
          </Text>
        </Text>
      </View>  
      
    </>
  )
}

export function Page_3({setCurrentPage})
{
  return (
    <>
      
      {/*Window*/}
      <View style={[onboardingStyles.previewWindow, { height: 320 }]}>
        <AnimatedEntryCard>        
          <Image
            source={require("@/assets/icons/onboarding/phoneframe.svg")}
            placeholder={"o"}
            style={{ width: 237, height: 538}}
          />
        </AnimatedEntryCard>
      </View>
      
      <View style={{width:"100%", flex: 1, display:"flex", justifyContent:"center", alignItems:"center"}}>      
        <Text style={[globalStyles.funnelExtraBold, {textAlign:"center", fontSize: 30}]}>
          Watch as local dealers reach out to help you find it 
        </Text>
      </View>
      
      {/*Footer*/}
      <View style={onboardingStyles.footer}>
        <TouchableOpacity style={onboardingStyles.nextButton} onPress={() => { setCurrentPage(4)}}>
          <Text style={[globalStyles.h3, {color:"white"}]}>
            Next
          </Text>
        </TouchableOpacity>
        
        <Text style={[globalStyles.h4, {fontSize: 15, textAlign:"center", marginTop: 15}]}>
          By proceeding to use Carloop, you agree to our
          <Text style={{color: colors.accent}}>
            {" terms of service "}
          </Text>
          and
          <Text style={{color: colors.accent}}>
             {" privacy policy "}
          </Text>
        </Text>
      </View>  
      
    </>
  )
}

export function Page_4({setCurrentPage})
{
  const router = useRouter();

  return (
    <>
      
      {/*Window*/}
      <View style={[onboardingStyles.previewWindow, { height: 320 }]}>
        <AnimatedEntryCard>        
          <Image
            source={require("@/assets/icons/onboarding/phoneframe.svg")}
            placeholder={"o"}
            style={{ width: 237, height: 538}}
          />
        </AnimatedEntryCard>
      </View>
      
      <View style={{width:"100%", flex: 1, display:"flex", justifyContent:"center", alignItems:"center"}}>      
        <Text style={[globalStyles.funnelExtraBold, {textAlign:"center", fontSize: 30}]}>
          Chat and call securely without sharing your number
        </Text>
      </View>
      
      {/*Footer*/}
      <View style={onboardingStyles.footer}>
        <TouchableOpacity style={onboardingStyles.nextButton} onPress={() => { router.push("/login") }}>
          <Text style={[globalStyles.h3, {color:"white"}]}>
            Next
          </Text>
        </TouchableOpacity>
        
        <Text style={[globalStyles.h4, {fontSize: 15, textAlign:"center", marginTop: 15}]}>
          By proceeding to use Carloop, you agree to our
          <Text style={{color: colors.accent}}>
            {" terms of service "}
          </Text>
          and
          <Text style={{color: colors.accent}}>
             {" privacy policy "}
          </Text>
        </Text>
      </View>  
      
    </>
  )
}

export const styles = StyleSheet.create({
  mainFrame: {
    width: "100%",
    height: "100%",
    
    display: "flex",
    flexDirection: "column",
    alignItems:"center"
  },
  
  circleFrame: {
    width: "100%",
    flex: 1,
    
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  }
})