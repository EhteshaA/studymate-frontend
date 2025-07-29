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
    Spinner // Import Spinner for loading indicator
} from '@chakra-ui/react';
import { FaMicrophone, FaStop, FaGithub, FaTwitter, FaLinkedin, FaBookOpen, FaDownload } from 'react-icons/fa';
import CustomToast from './CustomToast'; // Assuming CustomToast.js is in the same directory

function App() {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState("Waiting for your voice...");
    const [isLoading, setIsLoading] = useState(false); // New state for loading indicator
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const toast = useToast();
    const [audioBlobUrl, setAudioBlobUrl] = useState(null);
    const [notes, setNotes] = useState([]); // State to store fetched notes (transcriptions)

    // IMPORTANT: Replace this with your actual API Gateway Invoke URL + /notes
    // This URL will be used for both POST (sending audio) and GET (fetching notes)
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

            // Assuming your Lambda returns data in the format: {"notes": [...]}
            setNotes(data.notes || []); // Update the state with the fetched notes
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
    // The empty dependency array [] means this runs once after the initial render
    useEffect(() => {
        fetchNotes();
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setIsRecording(true);
            setTranscript("Recording... Speak now!");
            setAudioBlobUrl(null); // Reset audio URL on new recording
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

            mediaRecorderRef.current.onstop = async () => { // Made onstop async
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                console.log("Audio Blob created:", audioBlob);
                audioChunksRef.current = [];

                const url = URL.createObjectURL(audioBlob);
                setAudioBlobUrl(url);

                setTranscript("Recording stopped. Sending for transcription...");
                
                // Call the new function to send audio to backend
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

    // New function to send audio to Lambda for transcription
    const sendAudioForTranscription = async (audioBlob) => {
        setIsLoading(true); // Start loading
        setTranscript("Sending audio for transcription...");

        // Convert audio Blob to Base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
            const base64Audio = reader.result.split(',')[1]; // Get only the Base64 part

            try {
                const response = await fetch(API_ENDPOINT_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        audioData: base64Audio,
                        userId: 'ehtesha_user_123', // Consistent user ID
                        // You might add other metadata here if needed
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || 'Unknown error'}`);
                }

                const data = await response.json();
                console.log('Transcription request successful:', data);
                setTranscript(data.message || "Transcription request sent!"); // Update transcript with backend message
                
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

                // After successful transcription request, refresh the notes list
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
                setIsLoading(false); // Stop loading regardless of success or failure
            }
        };
        reader.onerror = (error) => {
            console.error("Error converting audio to Base64:", error);
            setTranscript("Error processing audio.");
            setIsLoading(false);
        };
    };

    return (
        <Flex direction="column" minH="100vh" bg="#f8f9fa" color="gray.800">
            {/* Header - Dark Blue like Professional Solutions */}
            <Box as="header" w="100%" p={4} bg="#2c3e50" boxShadow="sm">
                <Flex align="center" maxW="container.xl" mx="auto">
                    <HStack spacing={2}>
                        <FaBookOpen size="20px" color="white" />
                        <Heading as="h1" size="md" color="white" fontFamily="heading">
                            StudyMate
                        </Heading>
                    </HStack>
                    <Spacer />
                    <HStack spacing={6}>
                        <Link href="#" color="white" _hover={{ color: '#3498db' }} fontWeight="medium">Home</Link>
                        <Link href="#" color="white" _hover={{ color: '#3498db' }} fontWeight="medium">Dashboard</Link>
                        <Link href="#" color="white" _hover={{ color: '#3498db' }} fontWeight="medium">Settings</Link>
                    </HStack>
                </Flex>
            </Box>

            {/* Main Content */}
            <VStack
                flex="1"
                p={8}
                spacing={8}
                justify="center"
                align="center"
            >
                <Container maxW="container.sm" textAlign="center" p={12} bg="#555555" borderRadius="lg" boxShadow="lg">
                    <Heading as="h1" size="xl" mb={6} color="white" fontFamily="cursive">
                        StudyMate: Voice-Powered Notes
                    </Heading>
                    <Text fontSize="md" mb={12} color="white" fontWeight="normal" fontFamily="heading" opacity={0.9}>
                        Record your thoughts, lectures, or study sessions. We'll transcribe them for you!
                    </Text>

                    <Button
                        leftIcon={isRecording ? <FaStop /> : <FaMicrophone />}
                        bg={isRecording ? "#e74c3c" : "#3498db"}
                        color="white"
                        size="lg"
                        height="50px"
                        width="180px"
                        borderRadius="md"
                        boxShadow="md"
                        onClick={isRecording ? stopRecording : startRecording}
                        isLoading={isLoading} // Use isLoading for the button
                        loadingText="Processing..." // Text when loading
                        _hover={{
                            transform: 'scale(1.02)',
                            boxShadow: 'lg',
                            bg: isRecording ? "#c0392b" : "#2980b9"
                        }}
                        _active={{ transform: 'scale(0.98)' }}
                        border="none"
                        fontSize="md"
                        fontWeight="medium"
                        isDisabled={isLoading} // Disable button while loading
                    >
                        {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </Button>

                    <Text fontSize="sm" mt={2} fontWeight="normal" color="white" fontFamily="body" opacity={0.8}>
                        {isLoading ? (
                            <HStack justify="center" mt={2}>
                                <Spinner size="sm" color="white" />
                                <Text>Transcribing audio...</Text>
                            </HStack>
                        ) : (
                            transcript
                        )}
                    </Text>

                    {/* Download Audio Button */}
                    {audioBlobUrl && !isLoading && ( // Only show download if not loading
                        <Button
                            as="a"
                            href={audioBlobUrl}
                            download="recorded_audio.webm"
                            leftIcon={<FaDownload />}
                            variant="link"
                            color="white"
                            size="md"
                            mt={4}
                            _hover={{
                                textDecoration: 'underline',
                                color: "gray.300"
                            }}
                        >
                            Download Audio
                        </Button>
                    )}

                </Container>

                {/* Display Fetched Notes (Transcriptions) */}
                <Box mt={8} p={6} bg="white" borderRadius="lg" boxShadow="md" maxW="container.sm" width="100%" textAlign="left">
                    <Heading size="md" mb={3} color="#2c3e50" fontFamily="heading" textAlign="center">Your Transcribed Notes</Heading>
                    {notes.length === 0 ? (
                        <Text color="gray.600" fontFamily="body" textAlign="center">No transcribed notes yet. Record something!</Text>
                    ) : (
                        <VStack spacing={4} align="stretch">
                            {notes.map((note) => (
                                <Box key={note.noteId} p={4} borderWidth="1px" borderRadius="md" borderColor="brand.200" bg="brand.50">
                                    <Text fontSize="sm" color="gray.500">Note ID: {note.noteId}</Text>
                                    <Text fontSize="md" fontWeight="medium" mt={1}>{note.noteContent}</Text>
                                    <Text fontSize="xs" color="gray.400" mt={1}>Recorded: {new Date(note.timestamp).toLocaleString()}</Text>
                                    {/* You can add more details or actions here */}
                                </Box>
                            ))}
                        </VStack>
                    )}
                </Box>

            </VStack>

            {/* Footer - Dark Blue matching header */}
            <Box as="footer" w="100%" p={4} bg="#2c3e50" borderTop="1px" borderColor="#34495e" mt="auto" boxShadow="sm">
                <Flex align="center" maxW="container.xl" mx="auto" direction={{ base: 'column', md: 'row' }}>
                    <Text color="white" fontSize="sm" fontFamily="body">&copy; {new Date().getFullYear()} StudyMate. All rights reserved.</Text>
                    <Spacer />
                    <HStack spacing={4} mt={{ base: 4, md: 0 }}>
                        <IconButton
                            as="a"
                            href="https://github.com"
                            target="_blank"
                            aria-label="GitHub"
                            icon={<FaGithub />}
                            variant="ghost"
                            color="white"
                            _hover={{ color: '#3498db', bg: 'rgba(255,255,255,0.1)' }}
                        />
                        <IconButton
                            as="a"
                            href="https://twitter.com"
                            target="_blank"
                            aria-label="Twitter"
                            icon={<FaTwitter />}
                            variant="ghost"
                            color="white"
                            _hover={{ color: '#3498db', bg: 'rgba(255,255,255,0.1)' }}
                        />
                        <IconButton
                            as="a"
                            href="https://linkedin.com"
                            target="_blank"
                            aria-label="LinkedIn"
                            icon={<FaLinkedin />}
                            variant="ghost"
                            color="white"
                            _hover={{ color: '#3498db', bg: 'rgba(255,255,255,0.1)' }}
                        />
                    </HStack>
                </Flex>
            </Box>
        </Flex>
    );
}

export default App;
