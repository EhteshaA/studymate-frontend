import React from 'react';
import { Box, Text, VStack } from '@chakra-ui/react'; // Import VStack

const CustomToast = ({ title, description, status }) => {
    let textColor = "white"; // Default text color
    let bgColor = "gray.700"; // Default grey for info/general toasts
    let textShadow = "1px 1px 2px rgba(0, 0, 0, 0.5)"; // Subtle black shadow for all toasts
    let boxShadow = "lg"; // Default shadow

    if (status === "success") {
        bgColor = "transparent";   // Transparent background for success
        textColor = "white"; 
        // textShadow will now be applied from the default declaration above
        boxShadow = "none"; // No shadow for transparent toast
    } else if (status === "error") {
        bgColor = "red.500";   // Red for error
        textColor = "white";
        // textShadow will now be applied from the default declaration above
        boxShadow = "lg"; // Keep shadow for error toast
    } else if (status === "info") {
        bgColor = "transparent";   // Transparent background for info
        textColor = "white"; 
        // textShadow will now be applied from the default declaration above
        boxShadow = "none"; // No shadow for transparent toast
    }

    return (
        <Box
            bg={bgColor} // Apply background color based on status
            boxShadow={boxShadow} // Apply shadow based on status
            borderRadius="md" // Rounded corners for a softer look
            p={3} // Padding inside the toast
            display="flex"
            alignItems="center"
            justifyContent="center"
            width="auto" // Allow the toast to size based on content
            minWidth="200px" // Ensure a minimum width for readability
            maxWidth="300px" // Ensure a maximum width to prevent overflow
        >
            {/* IMPORTANT: Wrap title and description in a VStack to ensure a single child for the Box */}
            <VStack spacing={1} align="center"> 
                <Text color={textColor} fontSize="lg" fontWeight="bold" textAlign="center" textShadow={textShadow}>
                    {title}
                </Text>
                {description && (
                    <Text color={textColor} fontSize="md" textAlign="center" textShadow={textShadow}>
                        {description}
                    </Text>
                )}
            </VStack>
        </Box>
    );
};

export default CustomToast;
