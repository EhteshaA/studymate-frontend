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
    Avatar, // Import Avatar for profile image
    Icon // Import Icon for general icons
} from '@chakra-ui/react';
import { 
    FaMicrophone, 
    FaStop, 
    FaGithub, 
    FaTwitter, 
    FaLinkedin, 
    FaBookOpen, 
    FaDownload,
    FaHome, // Home icon for sidebar simulation
    FaChartBar, // Dashboard icon for sidebar simulation
    FaCog, // Settings icon for sidebar simulation
    FaMicrophoneAlt, // Voice Notes icon for sidebar simulation
    FaFileAlt, // My Notes icon for sidebar simulation
    FaBell // Notification icon for header
} from 'react-icons/fa';
import CustomToast from './CustomToast'; // Assuming CustomToast.js is in the same directory

// Define a pulsing animation for the microphone icon
const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
`;

function App() {
    // State management for recording, transcription, loading, and notes
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState("Waiting for your voice...");
    const [isLoading, setIsLoading] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const toast = useToast();
    const [audioBlobUrl, setAudioBlobUrl] = useState(null);
    const [notes, setNotes] = useState([]);

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
    useEffect(() => {
        fetchNotes();
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setIsRecording(true);
            setTranscript("Recording... Speak now!");
            setAudioBlobUrl(null);
            toast({
                position: "top",
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

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                console.log("Audio Blob created:", audioBlob);
                audioChunksRef.current = [];

                const url = URL.createObjectURL(audioBlob);
                setAudioBlobUrl(url);

                setTranscript("Recording stopped. Sending for transcription...");
                
                await sendAudioForTranscription(audioBlob);

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

                fetchNotes();

            } catch (error) {
                console.error('Error sending audio for transcription:', error);
                setTranscript(`Error: ${error.message}`);
                toast({
                    position: "top",
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
        { icon: FaHome, label: 'Home', href: '#' },
        { icon: FaMicrophoneAlt, label: 'Voice Notes', href: '#' },
        { icon: FaFileAlt, label: 'My Notes', href: '#' },
        { icon: FaChartBar, label: 'Dashboard', href: '#' },
        { icon: FaCog, label: 'Settings', href: '#' },
    ];

    return (
        <Flex direction="column" minH="100vh" bg="gray.50" color="gray.800">
            {/* Header - Dark Blue like Professional Solutions */}
            <Box as="header" w="100%" p={4} bg="blue.800" boxShadow="md">
                <Flex align="center" maxW="container.xl" mx="auto">
                    {/* App Logo and Name */}
                    <HStack spacing={2}>
                        <FaBookOpen size="20px" color="white" />
                        <Heading as="h1" size="md" color="white" fontFamily="heading">
                            StudyMate
                        </Heading>
                    </HStack>

                    <Spacer /> {/* Pushes elements to the right */}

                    {/* Right-side Icons/User Info */}
                    <HStack spacing={4}>
                        {/* Notification Icon */}
                        <IconButton
                            icon={<FaBell />}
                            aria-label="Notifications"
                            variant="ghost"
                            color="whiteAlpha.800"
                            _hover={{ color: 'blue.300', bg: 'whiteAlpha.100' }}
                            transition="all 0.2s ease-in-out"
                            size="md"
                        />
                        {/* User Profile/Avatar */}
                        <Avatar
                            size="sm"
                            name="Ehtesha Amir" // Placeholder name
                            src="https://placehold.co/150x150/3498db/ffffff?text=EA" // Placeholder image for profile
                            cursor="pointer"
                            _hover={{ opacity: 0.8 }}
                            transition="all 0.2s ease-in-out"
                        />
                    </HStack>
                </Flex>
            </Box>

            {/* Main Content Area - Responsive Dashboard Layout */}
            <Flex flex="1" direction={{ base: 'column', md: 'row' }}> {/* Stacks vertically on mobile, horizontally on desktop */}
                {/* Simulated Sidebar for Dashboard Links (Responsive) */}
                <Box
                    as="nav"
                    w={{ base: 'full', md: '250px' }} // Full width on mobile, fixed on desktop
                    bg="blue.700" // A slightly lighter blue for sidebar
                    color="white"
                    p={4}
                    boxShadow="lg" // Add a shadow for depth
                    minH={{ base: 'auto', md: 'calc(100vh - 64px)' }} // Adjust height for header on desktop
                    position={{ base: 'relative', md: 'sticky' }} // Relative on mobile, sticky on desktop
                    top={{ base: 'auto', md: '0' }} // Sticks to the top on desktop
                    zIndex="1" // Ensure it's above other content if sticky
                >
                    <VStack spacing={6} align="stretch" mt={{ base: 2, md: 8 }}> {/* Spacing for navigation items */}
                        {navItems.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                _hover={{ textDecoration: 'none', bg: 'blue.600', color: 'white' }}
                                borderRadius="md"
                                p={3}
                                transition="all 0.2s ease-in-out"
                                display="flex"
                                alignItems="center"
                            >
                                <Icon as={item.icon} mr={3} fontSize="xl" />
                                <Text fontSize="md" fontWeight="medium">{item.label}</Text>
                            </Link>
                        ))}
                    </VStack>
                </Box>

                {/* Main Content Area (Voice Recorder and Notes List) */}
                <VStack
                    flex="1" // Takes remaining space
                    p={{ base: 4, md: 8 }}
                    spacing={8}
                    align="center"
                    overflowY="auto" // Allow scrolling if content overflows
                >
                    {/* Main Recording Container - Lighter background, more rounded, prominent shadow */}
                    <Container 
                        maxW="container.sm" 
                        textAlign="center" 
                        p={{ base: 8, md: 12 }}
                        bg="white"
                        borderRadius="xl"
                        boxShadow="xl"
                        border="1px solid"
                        borderColor="gray.200"
                    >
                        <Heading as="h1" size={{ base: "xl", md: "2xl" }} mb={4} color="blue.800" fontFamily="heading">
                            Voice Notes
                        </Heading>
                        <Text fontSize={{ base: "md", md: "lg" }} mb={8} color="gray.600" fontWeight="normal" fontFamily="body">
                            Record your thoughts, lectures, or study sessions. We'll transcribe them for you!
                        </Text>

                        <Button
                            leftIcon={
                                isRecording ? (
                                    <Box as={FaStop} />
                                ) : (
                                    <Box as={FaMicrophone} animation={isRecording ? `${pulse} 1s infinite` : 'none'} />
                                )
                            }
                            bg={isRecording ? "red.500" : "blue.500"}
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
                                bg: isRecording ? "red.600" : "blue.600"
                            }}
                            _active={{ transform: 'scale(0.95)' }}
                            transition="all 0.2s ease-in-out"
                            fontSize="lg"
                            fontWeight="bold"
                            isDisabled={isLoading}
                        >
                            {isRecording ? 'Stop Recording' : 'Start Recording'}
                        </Button>

                        <Text fontSize="md" mt={4} fontWeight="medium" color="gray.700" fontFamily="body">
                            {isLoading ? (
                                <HStack justify="center" mt={2}>
                                    <Spinner size="sm" color="blue.500" />
                                    <Text>Transcribing audio...</Text>
                                </HStack>
                            ) : (
                                transcript
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
                                color="blue.500"
                                size="md"
                                mt={4}
                                _hover={{
                                    textDecoration: 'underline',
                                    color: "blue.600"
                                }}
                                transition="all 0.2s ease-in-out"
                            >
                                Download Audio
                            </Button>
                        )}
                    </Container>

                    {/* Display Fetched Notes (Transcriptions) - Now scrollable and with distinct cards */}
                    <Box 
                        mt={8} 
                        p={6} 
                        bg="white" 
                        borderRadius="xl" 
                        boxShadow="none" // Removed shadow from the main notes container
                        maxW="container.sm" 
                        width="100%" 
                        textAlign="left"
                        maxH="400px" // Max height for scrollability
                        overflowY="auto" // Enable vertical scrolling
                        border="1px solid" 
                        borderColor="gray.200" 
                    >
                        <Heading size="md" mb={6} color="blue.800" fontFamily="heading" textAlign="center">Your Transcribed Notes</Heading>
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
                                        boxShadow="none" // Removed shadow from individual note cards
                                        _hover={{ boxShadow: "none", transform: "translateY(-2px)" }} // Removed hover shadow
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
                </VStack>
            </Flex>

            {/* Footer - Dark Blue matching header */}
            <Box as="footer" w="100%" p={4} bg="blue.800" borderTop="1px" borderColor="blue.900" mt="auto" boxShadow="sm">
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
                            _hover={{ color: 'blue.300', bg: 'whiteAlpha.100' }}
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
                            _hover={{ color: 'blue.300', bg: 'whiteAlpha.100' }}
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
                            _hover={{ color: 'blue.300', bg: 'whiteAlpha.100' }}
                            transition="all 0.2s ease-in-out"
                        />
                    </HStack>
                </Flex>
            </Box>
        </Flex>
    );
}

export default App;
