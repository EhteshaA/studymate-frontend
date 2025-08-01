import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    Button,
    Text,
    VStack,
    Heading,
    Container,
    useToast,
    Flex,
    Spacer,
    IconButton,
    HStack,
    Link,
    Spinner,
    keyframes, // Import keyframes for animations
    Avatar,
    Icon,
    Image,
    SimpleGrid // Import SimpleGrid for modular cards layout
} from '@chakra-ui/react';
import { 
    FaMicrophone, 
    FaStop, 
    FaGithub, 
    FaTwitter, 
    FaLinkedin, 
    FaBookOpen, 
    FaDownload,
    FaHome, 
    FaChartBar, 
    FaCog, 
    FaMicrophoneAlt, 
    FaFileAlt, 
    FaBell,
    FaLightbulb, 
    FaRocket,    
    FaArrowRight,
    FaRegChartBar, // For Session Stats
    FaRegFileAlt, // For Transcript History
    FaFire, // For Streak Tracker
    FaUserLock, // For Account Preferences
    FaHeadphones, // For Voice Note Settings
    FaBell as FaBellIcon, // For Notifications (aliased to avoid conflict with header bell)
    FaPlug // For Integrations
} from 'react-icons/fa';
import CustomToast from './CustomToast';

// Define a pulsing animation for the microphone icon (updated to box-shadow pulse)
const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(113, 128, 150, 0.4); } /* gray.500 with opacity */
  70% { box-shadow: 0 0 0 20px rgba(113, 128, 150, 0); }
  100% { box-shadow: 0 0 0 0 rgba(113, 128, 150, 0); }
`;

// Define new keyframes for the fade-in and scale-up animation for the Home and Voice Notes sections
const fadeSlideScale = keyframes`
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

// Keyframes for the subtle pulse animation for "Dashboard Coming Soon"
const subtlePulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.02); opacity: 0.8; }
`;

function App() {
    // State management for recording, transcription, loading, and notes
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState("Waiting for your voice...");
    const [isLoading, setIsLoading] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]); // Use a ref for audio chunks to avoid re-renders on every chunk
    const toast = useToast();
    const [audioBlobUrl, setAudioBlobUrl] = useState(null);
    const [notes, setNotes] = useState([]);

    // New state for active section, default to 'home'
    const [activeSection, setActiveSection] = useState('home');
    const [userName, setUserName] = useState("Ehtesha"); // For personalization

    // IMPORTANT: Replace this with your actual API Gateway Invoke URL + /notes
    const API_ENDPOINT_URL = 'https://jjkqlvqpe7.execute-api.us-east-1.amazonaws.com/default/notes'; 

    // Function to fetch notes (transcriptions) from the backend
    const fetchNotes = async () => {
        try {
            console.log('Fetching notes from:', API_ENDPOINT_URL);
            const response = await fetch(API_ENDPOINT_URL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Fetched Notes Data:', data);
            setNotes(data.notes || []);
        } catch (error) {
            console.error('Error fetching notes:', error);
            toast({
                position: "top",
                duration: 5000,
                isClosable: true,
                render: () => (
                    <CustomToast
                        title="Error Fetching Notes"
                        description={error.message}
                        status="error"
                    />
                ),
            });
        }
    };

    // useEffect hook to fetch notes when the component mounts
    // This will run when the component mounts, and also when activeSection becomes 'my-notes'
    useEffect(() => {
        if (activeSection === 'my-notes') {
            fetchNotes();
        }
    }, [activeSection]); // Fetch notes only when 'my-notes' section is active

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setIsRecording(true);
            setTranscript("Listening..."); // Changed for visual feedback
            setAudioBlobUrl(null); // Reset audio URL on new recording
            toast({
                position: "top",
                top: "-10px", // Changed from 0px to -10px to shift it further up
                duration: 2000,
                isClosable: true,
                render: () => (
                    <CustomToast
                        title="Recording Started"
                        description="Microphone is active."
                        status="info" 
                    />
                ),
            });

            mediaRecorderRef.current = new MediaRecorder(stream);

            // Clear previous audio chunks before starting a new recording
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                console.log("Audio Blob created:", audioBlob);
                audioChunksRef.current = []; // Clear chunks after creating blob

                setTranscript("Recording stopped. Sending for transcription...");
                
                await sendAudioForTranscription(audioBlob);

                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();

        } catch (error) {
            console.error("Error accessing microphone:", error);
            setTranscript("Microphone access denied or error occurred.");
            setIsRecording(false);
            setAudioBlobUrl(null);
            toast({
                position: "top",
                top: "-10px", // Changed from 0px to -10px to shift it further up
                duration: 5000,
                isClosable: true,
                render: () => (
                    <CustomToast
                        title="Microphone Error"
                        description="Access denied or an error occurred. Please check permissions."
                        status="error"
                    />
                ),
            });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        setTranscript("Stopping recording...");
        console.log("Stopping recording.");
    };

    const sendAudioForTranscription = async (audioBlob) => {
        setIsLoading(true);
        setTranscript("Sending audio for transcription...");

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
            const base64Audio = reader.result.split(',')[1];

            try {
                const response = await fetch(API_ENDPOINT_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        audioData: base64Audio,
                        userId: 'ehtesha_user_123',
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || 'Unknown error'}`);
                }

                const data = await response.json();
                console.log('Transcription request successful:', data);
                setTranscript(data.message || "Transcription request sent!");
                
                toast({
                    position: "top",
                    top: "-10px", // Changed from 0px to -10px to shift it further up
                    duration: 5000,
                    isClosable: true,
                    render: () => (
                        <CustomToast
                            title="Transcription Sent!"
                            description={data.message || "Audio sent for processing."}
                            status="success"
                        />
                    ),
                });

                // No need to call fetchNotes here, it will be called when 'my-notes' is selected
                // fetchNotes(); 

            } catch (error) {
                console.error('Error sending audio for transcription:', error);
                setTranscript(`Error: ${error.message}`);
                toast({
                    position: "top",
                    top: "-10px", // Changed from 0px to -10px to shift it further up
                    duration: 5000,
                    isClosable: true,
                    render: () => (
                        <CustomToast
                            title="Transcription Failed"
                            description={error.message}
                            status="error"
                        />
                    ),
                });
            } finally {
                setIsLoading(false);
            }
        };
        reader.onerror = (error) => {
            console.error("Error converting audio to Base64:", error);
            setTranscript("Error processing audio.");
            setIsLoading(false);
        };
    };

    // Define navigation items for a simulated sidebar/dashboard links
    const navItems = [
        { id: 'home', icon: FaHome, label: 'Home' },
        { id: 'voice-notes', icon: FaMicrophoneAlt, label: 'Voice Notes' },
        { id: 'my-notes', icon: FaFileAlt, label: 'My Notes' },
        { id: 'dashboard', icon: FaChartBar, label: 'Dashboard' },
        { id: 'settings', icon: FaCog, label: 'Settings' },
    ];

    // Function to render content based on activeSection
    const renderContent = () => {
        switch (activeSection) {
            case 'home':
                return (
                    <Container 
                        maxW="container.md" 
                        p={8} 
                        // Apply soft gradient background
                        bgGradient="linear(to-r, gray.50, white)" 
                        borderRadius="2xl" // More rounded corners (20px)
                        boxShadow="xl" // Stronger shadow
                        textAlign="center"
                        animation={`${fadeSlideScale} 0.6s ease-out`} // Apply fade-in and scale-up animation
                    >
                        <Heading 
                            size="2xl" 
                            mb={4} 
                            color="gray.800" 
                            fontFamily="heading" 
                            fontSize="2.5rem" // Specific font size
                            fontWeight="bold" // Specific font weight
                        >
                            Welcome to StudyMate!
                        </Heading>
                        <Text 
                            color="gray.600" // Subtext color
                            mb={8} 
                            fontSize="1.2rem" // Specific font size (removed duplicate)
                        >
                            Your personal productivity companion. Use voice notes, manage your study sessions, and track your progress.
                        </Text>

                        {/* Feature Cards */}
                        <HStack spacing={6} justify="center" mb={10} flexWrap="wrap"> {/* flexWrap for responsiveness */}
                            <Box 
                                p={5} 
                                shadow="md" 
                                borderWidth="1px" 
                                borderRadius="lg" 
                                borderColor="gray.200"
                                bg="gray.100" 
                                flex="1" 
                                minW={{ base: "100%", sm: "200px" }} // Responsive width
                                transition="all 0.2s ease-in-out"
                                _hover={{ transform: "translateY(-5px)", shadow: "lg" }}
                            >
                                <Icon as={FaLightbulb} w={10} h={10} color="gray.700" mb={2} />
                                <Text fontWeight="semibold" fontSize="lg" color="gray.800">Organize Your Thoughts</Text>
                            </Box>
                            <Box 
                                p={5} 
                                shadow="md" 
                                borderWidth="1px" 
                                borderRadius="lg" 
                                borderColor="gray.200"
                                bg="gray.100" 
                                flex="1" 
                                minW={{ base: "100%", sm: "200px" }} // Responsive width
                                transition="all 0.2s ease-in-out"
                                _hover={{ transform: "translateY(-5px)", shadow: "lg" }}
                            >
                                <Icon as={FaRocket} w={10} h={10} color="gray.700" mb={2} />
                                <Text fontWeight="semibold" fontSize="lg" color="gray.800">Boost Productivity</Text>
                            </Box>
                        </HStack>

                        {/* Call-to-Action Button */}
                        <Button
                            bg="gray.700" // Darker grey for CTA
                            color="white"
                            size="lg"
                            height="50px"
                            borderRadius="xl" // More rounded corners
                            boxShadow="lg"
                            _hover={{
                                bg: "gray.800", // Even darker on hover
                                boxShadow: '2xl',
                                transform: 'scale(1.02)'
                            }}
                            _active={{ transform: 'scale(0.98)' }}
                            transition="all 0.3s ease-in-out"
                            fontSize="1.1rem" // Specific font size
                            fontWeight="600" // Specific font weight
                            rightIcon={<Icon as={FaArrowRight} />} // Arrow icon
                            onClick={() => setActiveSection('voice-notes')} // Direct to voice notes section
                        >
                            Start Now
                        </Button>
                    </Container>
                );
            case 'voice-notes':
                return (
                    <VStack 
                        flex="1" // Take remaining space
                        p={{ base: 4, md: 8 }}
                        spacing={8}
                        align="center"
                        // Removed justifyContent to allow the content to naturally align higher
                        // minH="calc(100vh - 128px)" // Ensure enough height for centering (header + footer height)
                        // Removed the outer white background and its box-shadow/border
                        // bgImage="url('https://placehold.co/1000x600/F7FAFC/E2E8F0?text=Abstract+Pattern')" // Light grey abstract pattern
                        // bgPosition="center"
                        // bgRepeat="no-repeat"
                        // bgSize="cover"
                        // borderRadius="xl" // Apply border radius to the VStack itself
                        // boxShadow="md" // Subtle shadow for the whole section
                        pt={{ base: 4, md: 10 }} // Add top padding to push it down slightly from the very top
                    >
                        <Container 
                            maxW="container.md" // Increased maxW to 'md' for a slightly larger card
                            textAlign="center" 
                            p={{ base: 8, md: 12 }}
                            // Glassmorphism effect
                            bg="rgba(255, 255, 255, 0.25)" // Semi-transparent white
                            backdropFilter="blur(12px)" // Blur effect
                            border="1px solid rgba(255, 255, 255, 0.18)" // Subtle border
                            borderRadius="2xl" // More rounded corners
                            boxShadow="0px 10px 30px rgba(0, 0, 0, 0.08)" // Deeper shadow
                            animation={`${fadeSlideScale} 0.6s ease-out`} // Apply fade-in and scale-up animation
                        >
                            <HStack justify="center" mb={4}> {/* Added HStack for heading and icon */}
                                <Icon as={FaMicrophoneAlt} w={10} h={10} color="gray.700" />
                                <Heading as="h1" size={{ base: "xl", md: "2xl" }} color="gray.800" fontFamily="heading" fontWeight="bold">
                                    Voice Notes
                                </Heading>
                            </HStack>
                            {/* Personalization */}
                            <Text fontSize="lg" color="gray.700" mb={4} fontWeight="semibold">
                                👋 Hi {userName}, ready to take notes?
                            </Text>
                            <Text fontSize={{ base: "md", md: "lg" }} mb={8} color="gray.600" fontWeight="normal" fontFamily="body">
                                Record your thoughts, lectures, or study sessions. We'll transcribe them for you!
                            </Text>

                            {/* Tooltip removed */}
                            <Button
                                leftIcon={
                                    // Conditional rendering for the icon, simplified to directly return Icon
                                    isRecording ? <Icon as={FaStop} /> : <Icon as={FaMicrophone} />
                                }
                                // Apply pulse animation to the button itself when recording
                                animation={isRecording ? `${pulse} 1s infinite` : 'none'} 
                                bgGradient={isRecording ? "linear(to-r, red.500, red.600)" : "linear(to-r, gray.600, gray.700)"}
                                color="white"
                                size="lg"
                                height="50px"
                                width={{ base: "full", md: "200px" }}
                                borderRadius="full"
                                boxShadow="lg"
                                onClick={isRecording ? stopRecording : startRecording}
                                isLoading={isLoading}
                                loadingText="Processing..."
                                _hover={{
                                    transform: 'scale(1.05)', 
                                    boxShadow: '2xl',
                                    bg: isRecording ? "red.700" : "gray.800",
                                    // Icon shift on hover moved to the button's _hover
                                    'svg': { transform: 'translateY(-2px)' } 
                                }}
                                _active={{ transform: 'scale(0.95)' }}
                                transition="all 0.2s ease-in-out"
                                fontSize="lg"
                                fontWeight="bold"
                                isDisabled={isLoading}
                                // role="group" is not strictly needed here as we are targeting 'svg' directly
                            >
                                {isRecording ? 'Stop Recording' : 'Start Recording'}
                            </Button>

                            <Text fontSize="md" mt={4} fontWeight="medium" color="gray.700" fontFamily="body">
                                {isLoading ? (
                                    <HStack justify="center" mt={2}>
                                        <Spinner size="sm" color="gray.500" />
                                        <Text>Transcribing audio...</Text>
                                    </HStack>
                                ) : (
                                    // Visual feedback for mic state
                                    isRecording ? "Listening..." : "Waiting for your voice..."
                                )}
                            </Text>

                            {/* Download Audio Button */}
                            {audioBlobUrl && !isLoading && (
                                <Button
                                    as="a"
                                    href={audioBlobUrl}
                                    download="recorded_audio.webm"
                                    leftIcon={<FaDownload />}
                                    variant="link"
                                    color="gray.500"
                                    size="md"
                                    mt={4}
                                    _hover={{
                                        textDecoration: 'underline',
                                        color: "gray.600"
                                    }}
                                    transition="all 0.2s ease-in-out"
                                >
                                    Download Audio
                                </Button>
                            )}
                        </Container>
                    </VStack>
                );
            case 'my-notes':
                return (
                    <Box 
                        p={6} 
                        bg="white" 
                        borderRadius="xl" 
                        boxShadow="none" // No shadow for the main notes container
                        maxW="container.sm" 
                        width="100%" 
                        textAlign="left"
                        maxH="600px" // Increased max height for notes list
                        overflowY="auto" 
                        border="1px solid" 
                        borderColor="gray.200" 
                    >
                        <Heading size="md" mb={6} color="gray.800" fontFamily="heading" textAlign="center">Your Transcribed Notes</Heading>
                        {notes.length === 0 ? (
                            <Text color="gray.500" fontFamily="body" textAlign="center" p={4}>No transcribed notes yet. Record something!</Text>
                        ) : (
                            <VStack spacing={4} align="stretch">
                                {notes.map((note) => (
                                    <Box 
                                        key={note.noteId} 
                                        p={4} 
                                        borderWidth="1px" 
                                        borderRadius="lg" 
                                        borderColor="gray.100" 
                                        bg="gray.50" 
                                        boxShadow="none" // No shadow for individual note cards
                                        _hover={{ boxShadow: "none", transform: "translateY(-2px)" }}
                                        transition="all 0.2s ease-in-out" 
                                    >
                                        <Text fontSize="xs" color="gray.500" fontWeight="semibold">Note ID: {note.noteId}</Text>
                                        <Text fontSize="md" fontWeight="medium" mt={1} color="gray.800">{note.noteContent}</Text>
                                        <Text fontSize="xs" color="gray.400" mt={1}>Recorded: {new Date(note.timestamp).toLocaleString()}</Text>
                                    </Box>
                                ))}
                            </VStack>
                        )}
                    </Box>
                );
            case 'dashboard':
                return (
                    <Container 
                        maxW="container.md" 
                        p={8} 
                        bgGradient="linear(135deg, #f0f4f8, #e0eafc)" // Changed to a softer, off-white gradient
                        borderRadius="xl" 
                        boxShadow="lg" 
                        textAlign="center"
                        animation={`${fadeSlideScale} 0.6s ease-out`} // Apply fade-in and scale-up animation
                    >
                        <Heading 
                            size="xl" 
                            mb={4} 
                            color="gray.800"
                            animation={`${subtlePulse} 2s infinite`} // Subtle pulse animation
                        >
                            Dashboard Coming Soon
                        </Heading>
                        <Text fontSize="lg" color="gray.600" mb={6}>
                            Stay tuned! We’re building something awesome for your productivity.
                        </Text>

                        {/* Progress Preview Skeleton */}
                        <VStack spacing={2} mb={6} maxW="300px" mx="auto">
                            <Box className="skeleton h-5 w-full rounded mb-2" bg="gray.200" height="20px" borderRadius="md"></Box>
                            <Box className="skeleton h-5 w-5/6 rounded mb-2" bg="gray.200" height="20px" borderRadius="md"></Box>
                            <Box className="skeleton h-5 w-2/3 rounded mb-2" bg="gray.200" height="20px" borderRadius="md"></Box>
                        </VStack>

                        {/* Feature Teaser Cards */}
                        <HStack spacing={4} justify="center" flexWrap="wrap">
                            <Box 
                                bg="white" 
                                rounded="lg" 
                                p={4} 
                                shadow="md" 
                                // Removed width="140px" to allow content-based width
                                textAlign="center"
                                transition="all 0.2s ease-in-out"
                                _hover={{ transform: "translateY(-3px)", boxShadow: "lg" }}
                                flex="1" // Allow boxes to grow and shrink
                                minW="120px" // Minimum width to prevent too small
                                maxW="160px" // Maximum width to prevent too large
                            >
                                <Icon as={FaRegChartBar} w={8} h={8} color="blue.500" mb={2} />
                                <Text fontSize="md" fontWeight="medium">Session Stats</Text>
                                <Text fontSize="xs" color="gray.400" mt={1}>Coming Soon</Text>
                            </Box>
                            <Box 
                                bg="white" 
                                rounded="lg" 
                                p={4} 
                                shadow="md" 
                                // Removed width="140px"
                                textAlign="center"
                                transition="all 0.2s ease-in-out"
                                _hover={{ transform: "translateY(-3px)", boxShadow: "lg" }}
                                flex="1"
                                minW="120px"
                                maxW="160px"
                            >
                                <Icon as={FaRegFileAlt} w={8} h={8} color="green.500" mb={2} />
                                <Text fontSize="md" fontWeight="medium">Transcript History</Text>
                                <Text fontSize="xs" color="gray.400" mt={1}>Coming Soon</Text>
                            </Box>
                            <Box 
                                bg="white" 
                                rounded="lg" 
                                p={4} 
                                shadow="md" 
                                // Removed width="140px"
                                textAlign="center"
                                transition="all 0.2s ease-in-out"
                                _hover={{ transform: "translateY(-3px)", boxShadow: "lg" }}
                                flex="1"
                                minW="120px"
                                maxW="160px"
                            >
                                <Icon as={FaFire} w={8} h={8} color="orange.500" mb={2} />
                                <Text fontSize="md" fontWeight="medium">Streak Tracker</Text>
                                <Text fontSize="xs" color="gray.400" mt={1}>Coming Soon</Text>
                            </Box>
                        </HStack>

                        <Text fontSize="xs" color="gray.400" mt={6}>Expected in late August 🚀</Text>
                    </Container>
                );
            case 'settings':
                return (
                    <Container 
                        maxW="container.md" 
                        p={8} 
                        bgGradient="linear(135deg, #f0f4f8, #e0eafc)" // Soft, off-white gradient for consistency
                        borderRadius="xl" 
                        boxShadow="lg" 
                        textAlign="center"
                        animation={`${fadeSlideScale} 0.6s ease-out`} // Apply fade-in and scale-up animation
                    >
                        <Heading 
                            size="xl" 
                            mb={4} 
                            color="gray.800"
                            animation={`${subtlePulse} 2s infinite`} // Subtle pulse animation
                        >
                            Settings Under Development
                        </Heading>
                        <Text fontSize="lg" color="gray.600" mb={6}>
                            We’re building powerful customization tools for you. Stay tuned! 💡
                        </Text>

                        {/* Modular Cards for Upcoming Settings */}
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mt={6}>
                            <Box bg="white" p={4} rounded="lg" shadow="md" transition="all 0.2s ease-in-out" _hover={{ transform: "translateY(-3px)", boxShadow: "lg" }}>
                                <HStack spacing={2} mb={1} alignItems="center">
                                    <Icon as={FaUserLock} color="purple.500" />
                                    <Text fontWeight="medium" color="gray.700">Account Preferences</Text>
                                </HStack>
                                <Text fontSize="xs" color="gray.500" mt={1}>Manage email, password & profile</Text>
                            </Box>
                            <Box bg="white" p={4} rounded="lg" shadow="md" transition="all 0.2s ease-in-out" _hover={{ transform: "translateY(-3px)", boxShadow: "lg" }}>
                                <HStack spacing={2} mb={1} alignItems="center">
                                    <Icon as={FaHeadphones} color="teal.500" />
                                    <Text fontWeight="medium" color="gray.700">Voice Note Settings</Text>
                                </HStack>
                                <Text fontSize="xs" color="gray.500" mt={1}>Control recording formats, language, etc.</Text>
                            </Box>
                            <Box bg="white" p={4} rounded="lg" shadow="md" transition="all 0.2s ease-in-out" _hover={{ transform: "translateY(-3px)", boxShadow: "lg" }}>
                                <HStack spacing={2} mb={1} alignItems="center">
                                    <Icon as={FaBellIcon} color="orange.500" /> {/* Using FaBellIcon alias */}
                                    <Text fontWeight="medium" color="gray.700">Notifications</Text>
                                </HStack>
                                <Text fontSize="xs" color="gray.500" mt={1}>Manage what alerts you receive</Text>
                            </Box>
                            <Box bg="white" p={4} rounded="lg" shadow="md" transition="all 0.2s ease-in-out" _hover={{ transform: "translateY(-3px)", boxShadow: "lg" }}>
                                <HStack spacing={2} mb={1} alignItems="center">
                                    <Icon as={FaPlug} color="blue.500" />
                                    <Text fontWeight="medium" color="gray.700">Integrations</Text>
                                </HStack>
                                <Text fontSize="xs" color="gray.500" mt={1}>Link with Google Drive, Notion, etc.</Text>
                            </Box>
                        </SimpleGrid>

                        {/* Skeleton Loader for Anticipated Fields */}
                        <VStack spacing={3} mt={8} maxW="400px" mx="auto" align="stretch">
                            <Box className="skeleton h-5 w-3/4 rounded" bg="gray.200" height="20px" borderRadius="md"></Box>
                            <Box className="skeleton h-5 w-1/2 rounded" bg="gray.200" height="20px" borderRadius="md"></Box>
                            <Box className="skeleton h-5 w-2/3 rounded" bg="gray.200" height="20px" borderRadius="md"></Box>
                        </VStack>

                        <Text fontSize="xs" color="gray.400" mt={6}>Expected rollout: mid August ⚙️</Text>
                    </Container>
                );
            default:
                return null;
        }
    };

    return (
        // Changed main background to plain white
        <Flex direction="column" minH="100vh" bg="white" color="gray.800">
            {/* Header - Dark Grey */}
            <Box as="header" w="100%" p={4} bg="gray.700" boxShadow="md">
                <Flex align="center" maxW="container.xl" mx="auto">
                    {/* App Logo and Name */}
                    <HStack spacing={2}>
                        <FaBookOpen size="20px" color="white" />
                        <Heading as="h1" size="md" color="white" fontFamily="heading">
                            StudyMate
                        </Heading>
                    </HStack>

                    <Spacer />

                    {/* Right-side Icons/User Info */}
                    <HStack spacing={4}>
                        <IconButton
                            icon={<FaBell />}
                            aria-label="Notifications"
                            variant="ghost"
                            color="whiteAlpha.800"
                            _hover={{ color: 'gray.300', bg: 'whiteAlpha.100' }}
                            transition="all 0.2s ease-in-out"
                            size="md"
                        />
                        <Avatar
                            size="sm"
                            name="Ehtesha Amir"
                            src="https://placehold.co/150x150/718096/ffffff?text=EA"
                            cursor="pointer"
                            _hover={{ opacity: 0.8 }}
                            transition="all 0.2s ease-in-out"
                        />
                    </HStack>
                </Flex>
            </Box>

            {/* Main Content Area - Responsive Dashboard Layout */}
            <Flex flex="1" direction={{ base: 'column', md: 'row' }}>
                {/* Simulated Sidebar for Dashboard Links (Responsive) */}
                <Box
                    as="nav"
                    w={{ base: 'full', md: '250px' }}
                    bg="gray.800"
                    color="white"
                    p={4}
                    boxShadow="lg"
                    minH={{ base: 'auto', md: 'calc(100vh - 64px)' }}
                    position={{ base: 'relative', md: 'sticky' }}
                    top={{ base: 'auto', md: '0' }}
                    zIndex="1"
                >
                    <VStack spacing={6} align="stretch" mt={{ base: 2, md: 8 }}>
                        {navItems.map((item) => (
                            <Link
                                key={item.id} // Use item.id as key
                                onClick={() => setActiveSection(item.id)} // Update active section on click
                                _hover={{ textDecoration: 'none', bg: 'gray.700', color: 'white' }}
                                borderRadius="md"
                                p={3}
                                transition="all 0.2s ease-in-out"
                                display="flex"
                                alignItems="center"
                                // Apply active style
                                bg={activeSection === item.id ? 'gray.700' : 'transparent'}
                                fontWeight={activeSection === item.id ? 'bold' : 'medium'}
                            >
                                <Icon as={item.icon} mr={3} fontSize="xl" />
                                <Text fontSize="md">{item.label}</Text>
                            </Link>
                        ))}
                    </VStack>
                </Box>

                {/* Dynamically Rendered Content */}
                <VStack
                    flex="1"
                    p={{ base: 4, md: 8 }}
                    spacing={8}
                    align="center"
                    overflowY="auto"
                >
                    {renderContent()} {/* Call renderContent function here */}
                </VStack>
            </Flex>

            {/* Footer - Dark Grey matching header */}
            <Box as="footer" w="100%" p={4} bg="gray.700" borderTop="1px" borderColor="gray.800" mt="auto" boxShadow="sm">
                <Flex align="center" maxW="container.xl" mx="auto" direction={{ base: 'column', md: 'row' }}>
                    <Text color="whiteAlpha.800" fontSize="sm" fontFamily="body">&copy; {new Date().getFullYear()} StudyMate. All rights reserved.</Text>
                    <Spacer />
                    <HStack spacing={4} mt={{ base: 4, md: 0 }}>
                        <IconButton
                            as="a"
                            href="https://github.com/EhteshaA/studymate-frontend"
                            target="_blank"
                            aria-label="GitHub"
                            icon={<FaGithub />}
                            variant="ghost"
                            color="whiteAlpha.800"
                            _hover={{ color: 'gray.300', bg: 'whiteAlpha.100' }}
                            transition="all 0.2s ease-in-out"
                        />
                        <IconButton
                            as="a"
                            href="https://twitter.com"
                            target="_blank"
                            aria-label="Twitter"
                            icon={<FaTwitter />}
                            variant="ghost"
                            color="whiteAlpha.800"
                            _hover={{ color: 'gray.300', bg: 'whiteAlpha.100' }}
                            transition="all 0.2s ease-in-out"
                        />
                        <IconButton
                            as="a"
                            href="https://linkedin.com"
                            target="_blank"
                            aria-label="LinkedIn"
                            icon={<FaLinkedin />}
                            variant="ghost"
                            color="whiteAlpha.800"
                            _hover={{ color: 'gray.300', bg: 'whiteAlpha.100' }}
                            transition="all 0.2s ease-in-out"
                        />
                    </HStack>
                </Flex>
            </Box>
        </Flex>
    );
}

export default App;
