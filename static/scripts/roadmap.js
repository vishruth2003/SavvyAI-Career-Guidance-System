document.addEventListener('DOMContentLoaded', function () {
    const container = document.querySelector('.container');
    const modal = document.getElementById('flowchartModal');
    const closeBtn = document.querySelector('.close-btn');
    const careerCards = document.querySelectorAll('.career-card');

    // Fetch suggestion data from Flask backend
    fetch('/api/suggestions')
        .then(response => response.json())
        .then(data => {
            const suggestion = data; // Store the fetched data

            // Render the flowchart and side columns dynamically
            renderColumns(suggestion.container);
            attachFlowchartEvents(); // Ensure events are attached after dynamic content is rendered
        })
        .catch(err => console.error('Error fetching suggestion data:', err));

    // Function to render the left, middle, and right columns dynamically
    function renderColumns(container) {
        const leftColumn = document.querySelector('.left-column');
        const middleColumn = document.querySelector('.middle-column');
        const rightColumn = document.querySelector('.right-column');

        // Clear existing columns
        leftColumn.innerHTML = '';
        middleColumn.innerHTML = '';
        rightColumn.innerHTML = '';

        // Render Left Column
        container.leftColumn.forEach(item => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.id = item.id;
            card.dataset.matches = item.matches.join(',');
            card.innerHTML = `
                <h3>${item.title}</h3>
                <ul>${item.content.map(content => `<li>${content}</li>`).join('')}</ul>
            `;
            leftColumn.appendChild(card);
        });

        // Render Middle Column (Flowchart Items)
        container.middleColumn.forEach(item => {
            const flowchartItem = document.createElement('div');
            flowchartItem.classList.add('flowchart-item');
            flowchartItem.id = item.id;
            flowchartItem.dataset.tooltip = item.tooltip;
            flowchartItem.innerText = item.title;
            middleColumn.appendChild(flowchartItem);
        });

        // Render Right Column
        container.rightColumn.forEach(item => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.id = item.id;
            card.dataset.matches = item.matches.join(',');
            card.innerHTML = `
                <h3>${item.title}</h3>
                <ul>${item.content.map(content => `<li>${content}</li>`).join('')}</ul>
            `;
            rightColumn.appendChild(card);
        });
    }

    async function openFlowchart(careerId) {
        try {
            const response = await fetch(`/api/layout/${careerId}`);
            const data = await response.json();
    
            if (data.error) {
                console.error('Error loading layout:', data.error);
                return;
            }
    
            // Get career name from the clicked card
            const careerCard = document.querySelector(`.career-card[data-id="${careerId}"]`);
            const careerName = careerCard.querySelector('h2').textContent;
    
            // Set the career name in the modal
            const modalTitle = modal.querySelector('.career-title');
            modalTitle.textContent = "Roadmap for "+careerName;
    
            // Show modal
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
    
            // Render the flowchart
            renderColumns(data.container);
            attachFlowchartEvents();
        } catch (error) {
            console.error('Error:', error);
        }
    }

    // Add click event to career cards
    careerCards.forEach(card => {
        card.addEventListener('click', () => {
            const careerId = card.dataset.id;
            openFlowchart(careerId);
        });
    });

    // Close modal
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        // Clear the career title
        modal.querySelector('.career-title').textContent = '';
        // Clear the flowchart
        document.querySelector('.left-column').innerHTML = '';
        document.querySelector('.middle-column').innerHTML = '';
        document.querySelector('.right-column').innerHTML = '';
        // Remove all arrows
        document.querySelectorAll('.arrow').forEach(arrow => arrow.remove());
    });

    // Close modal if clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            document.querySelectorAll('.arrow').forEach(arrow => arrow.remove());
        }
    });

    // Function to get matching cards based on data-matches attribute
    function getMatchingCards(flowchartId) {
        const matchingCards = [];
        document.querySelectorAll('.card').forEach(card => {
            const matches = card.dataset.matches.split(',');
            if (matches.includes(flowchartId)) {
                matchingCards.push(card.id);
            }
        });
        return matchingCards;
    }

    // Function to attach events to flowchart items
    function attachFlowchartEvents() {
        const flowchartItems = document.querySelectorAll('.flowchart-item');

        flowchartItems.forEach(item => {
            item.addEventListener('click', () => {
                const isActive = item.classList.contains('active');

                // Remove active state from all flowchart items
                flowchartItems.forEach(i => i.classList.remove('active'));
                document.querySelectorAll('.card').forEach(card => card.classList.remove('active'));
                document.querySelectorAll('.arrow').forEach(arrow => arrow.style.opacity = '0');

                // If the clicked flowchart item wasn't active, activate it and show related cards/arrows
                if (!isActive) {
                    item.classList.add('active');
                    const matchingCards = getMatchingCards(item.id);
                    matchingCards.forEach(cardId => {
                        const card = document.getElementById(cardId);
                        card.classList.add('active');
                        drawArrow(item.id, cardId);
                    });
                }
            });
        });

        // Add click listener to the container to reset if clicked outside a flowchart item
        container.addEventListener('click', (e) => {
            if (!e.target.closest('.flowchart-item')) {
                document.querySelectorAll('.flowchart-item').forEach(item => item.classList.remove('active'));
                document.querySelectorAll('.card').forEach(card => card.classList.remove('active'));
                document.querySelectorAll('.arrow').forEach(arrow => arrow.style.opacity = '0');
            }
        });
    }

    // Function to draw an arrow between flowchart item and card
    function drawArrow(startId, endId) {
        const flowchartItem = document.getElementById(startId);
        const card = document.getElementById(endId);
        const flowchartRect = flowchartItem.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const isLeftSide = endId.startsWith('l');
        const isRightSide = endId.startsWith('r');

        // Calculate vertical positions
        const startY = flowchartRect.top + (flowchartRect.height / 2) - containerRect.top;
        const endY = cardRect.top + (cardRect.height / 2) - containerRect.top;

        // Get the middle column element and its dimensions
        const middleColumn = document.querySelector('.middle-column');
        const middleRect = middleColumn.getBoundingClientRect();

        // Calculate horizontal positions
        let startX, endX;

        if (isLeftSide) {
            startX = middleRect.left - containerRect.left;
            endX = cardRect.right - containerRect.left;
        } else if (isRightSide) {
            startX = middleRect.right - containerRect.left;
            endX = cardRect.left - containerRect.left;
        }

        let arrowId = `arrow-${startId}-${endId}`;
        let arrow = document.getElementById(arrowId);

        if (!arrow) {
            arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            arrow.id = arrowId;
            arrow.classList.add('arrow');
            arrow.style.position = 'absolute';
            arrow.style.top = '0';
            arrow.style.left = '0';
            arrow.style.width = '100%';
            arrow.style.height = '100%';
            arrow.style.pointerEvents = 'none';
            container.appendChild(arrow);

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', 'currentColor');
            path.setAttribute('stroke-width', '2');
            arrow.appendChild(path);

            // Add arrowhead marker
            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
            const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');

            marker.appendChild(polygon);
            defs.appendChild(marker);
            arrow.appendChild(defs);

            path.setAttribute('marker-end', `url(#arrowhead-${arrowId})`);
        }

        const path = arrow.querySelector('path');

        // Calculate control points for smoother curve
        const dx = Math.abs(endX - startX) * 0.4;
        let pathD;

        if (isLeftSide) {
            pathD = `
                M ${startX} ${startY}
                C ${startX - dx} ${startY},
                  ${endX + dx} ${endY},
                  ${endX} ${endY}
            `;
        } else if (isRightSide) {
            pathD = `
                M ${startX} ${startY}
                C ${startX + dx} ${startY},
                  ${endX - dx} ${endY},
                  ${endX} ${endY}
            `;
        }

        path.setAttribute('d', pathD);
        arrow.style.opacity = '1';
    }
});
