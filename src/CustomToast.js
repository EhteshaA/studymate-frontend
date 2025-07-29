import React from 'react';
import { Box, Text } from '@chakra-ui/react';

const CustomToast = ({ title, description, status }) => {
    const textColor = "white";
    const textShadow = "1px 1px 2px rgba(0, 0, 0, 0.5)"; // Subtle black shadow

    return (
        <Box
            bg="transparent"
            boxShadow="none"
            borderRadius="none"
            p={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
            width="100%"
        >
            <Text color={textColor} fontSize="lg" fontWeight="bold" textAlign="center" textShadow={textShadow}>
                {title}
            </Text>
            {description && (
                <Text color={textColor} fontSize="md" textAlign="center" ml={2} textShadow={textShadow}>
                    {description}
                </Text>
            )}
        </Box>
    );
};

export default CustomToast;