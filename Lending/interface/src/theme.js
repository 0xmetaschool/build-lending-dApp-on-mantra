import { extendTheme } from "@chakra-ui/react";

const config = {
  initialColorMode: "light", // Default mode
  useSystemColorMode: false, // Use system preference
};

const colors = {
  light: {
    bg: "gray.100",
    text: "black",
  },
  dark: {
    bg: "gray.800",
    text: "white",
  },
};

const theme = extendTheme({
  config,
  styles: {
    global: (props) => ({
      body: {
        bg: props.colorMode === "dark" ? colors.dark.bg : colors.light.bg,
        color: props.colorMode === "dark" ? colors.dark.text : colors.light.text,
      },
    }),
  },
});

export default theme;