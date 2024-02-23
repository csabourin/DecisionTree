// Adds event listener for DOMContentLoaded to ensure the DOM is fully loaded before executing the script.
document.addEventListener('DOMContentLoaded', async function() {
  let jsonData = {};
  const openDepth = 3; // Defines how many levels of the tree are open by default
  const toggleAllTextOpen = 'Toggle all text open';
  const toggleAllTextClosed = 'Toggle all text closed';

  // Attempts to fetch the tree structure from a JSON file.
  try {
    const response = await fetch("./tree.json");
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    jsonData = await response.json(); // Parses JSON response into jsonData object
  } catch (error) {
    console.error('There has been a problem with your fetch operation:', error);
  }

  function showFeedback(feedback, feedbackP) {
    // Update the feedback text content
    feedbackP.textContent = feedback;
  }

  function createQASection(node, parentElement) {
    if (node.question) {
      const qaDiv = document.createElement('div');
      qaDiv.classList.add('qa-section');

      const questionP = document.createElement('p');
      questionP.textContent = node.question;
      qaDiv.appendChild(questionP);

      const answersContainer = document.createElement('div');
      node.answers.forEach(answer => {
        const answerButton = document.createElement('button');
        answerButton.setAttribute('aria-label', node.question + ': ' + answer.name);
        answerButton.textContent = answer.name;
        answerButton.classList.add('answer');

        // Adds click event listener to each answer to show feedback
        answerButton.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          const feedbackP = qaDiv.querySelector('.feedback'); // Find the feedback paragraph
          showFeedback(answer.feedback, feedbackP);
        });

        answersContainer.appendChild(answerButton);
      });

      qaDiv.appendChild(answersContainer);

      // Create feedback paragraph and append it to qaDiv
      const feedbackP = document.createElement('p');
      feedbackP.classList.add('feedback');
      feedbackP.setAttribute('aria-live', 'polite');
      qaDiv.appendChild(feedbackP);

      parentElement.appendChild(qaDiv);
    }
  }

  /**
   * Toggles the visibility of all nodes in the tree and updates ARIA attributes.
   * @param {boolean} expand - The desired state of expansion.
   */
  function toggleAllNodes(expand, button) {
    const allExpandableNodes = document.querySelectorAll('.tree .expandable');
    allExpandableNodes.forEach(li => {
      const ul = li.querySelector('ul');
      if (ul) {
        const shouldBeExpanded = expand ? 'true' : 'false';
        ul.classList.toggle('hidden', !expand);
        ul.classList.toggle('expanded', expand);
        ul.setAttribute('aria-hidden', !expand);
        ul.setAttribute('aria-live', expand ? 'off' : 'polite');
        li.setAttribute('aria-expanded', shouldBeExpanded);

        // Remove 'aria-live' from expandable nodes when expanding or collapsing
        // ul.removeAttribute('aria-live');

        // Update attributes based on the new visibility state.
        if (expand) {
          setAttributesForVisibleState(ul);
          // Optionally, set 'aria-live' to 'polite' on the child ul if expanded
          // ul.setAttribute('aria-live', 'polite');
        } else {
          setAttributesForHiddenState(ul);
        }
      }
    });
    // Update the button text based on the current state
    button.textContent = expand ? toggleAllTextClosed : toggleAllTextOpen;

  }




  /**
   * Builds a tree structure from a JSON object recursively.
   * @param {Object} node - The current node in the JSON tree.
   * @param {HTMLElement} parentElement - The parent element to attach the current node to.
   * @param {number} depth - The current depth in the tree, used for indentation and hierarchy.
   */
  function buildTree(node, parentElement, depth = 0) {
    const li = document.createElement('li');
    // Chooses an appropriate tag based on the node's depth in the tree.
    const levelHeader = document.createElement(depth === 0 ? 'h2' : depth === 1 ? 'h3' : 'span');
    levelHeader.textContent = node.name;
    li.appendChild(levelHeader);

    // Processes node's children if any are present.
    if (node.children && node.children.length > 0) {
      const div = document.createElement('div');
      const ul = document.createElement('ul');
      ul.setAttribute('aria-label', `${node.name}`); // Direct label
      div.setAttribute('aria-live', depth > openDepth ? 'polite' : 'off');
      ul.className = depth < openDepth ? '' : 'hidden';
      div.classList.add(`level${depth}`);
      ul.setAttribute('aria-hidden', depth < openDepth ? 'false' : 'true');

      // Recursively builds the tree for each child node.
      node.children.forEach(childNode => buildTree(childNode, ul, depth + 1));
      li.appendChild(div);
      div.appendChild(ul);

      // Adds a bottom div with question text if available, indicating the node's expandable state.
      const bottom = document.createElement('div');
      bottom.classList.add('bottom');
      if (node.question) createQASection(node, bottom);
      li.appendChild(bottom);


      // Configures expandable nodes with appropriate ARIA attributes and event listeners for accessibility.
      if (depth >= openDepth) {
        setupExpandableNode(li, depth);
      }
    }

    parentElement.appendChild(li);
  }

  /**
   * Sets up an expandable node with event listeners and ARIA attributes.
   * @param {HTMLElement} li - The list item element to make expandable.
   * @param {number} depth - The current depth of the node, used to determine event listener logic.
   */
  function setupExpandableNode(li, depth) {
    li.setAttribute('tabindex', '0');
    li.dataset.collapsed = 'false';
    const ul = li.querySelector('ul');
    ul.setAttribute('aria-live', 'polite');
    ul.setAttribute('aria-expanded', 'false');
    li.classList.add('expandable');
    li.addEventListener('click', e => toggleChildrenVisibility.call(li, e, depth));
    li.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && depth >= openDepth) {
        e.preventDefault();
        toggleChildrenVisibility.call(li, e, depth);
      }
    });
  }

  /**
   * Toggles the visibility of a node's children.
   * @param {Event} e - The event that triggered the toggle.
   * @param {number} depth - The depth of the current node, used to apply conditional logic.
   */
  function toggleChildrenVisibility(e, depth) {
    e.stopPropagation();
    const childrenDiv = this.querySelector('div');
    const childrenUl = this.querySelector('ul');
    const isCollapsed = this.dataset.collapsed === 'true'; // Check the data-collapsed state
    if (childrenUl) {
      childrenUl.classList.toggle('hidden', isCollapsed);
      childrenUl.classList.toggle('expanded', !isCollapsed);
      childrenUl.setAttribute('aria-hidden', isCollapsed);
      childrenDiv.setAttribute('aria-live', !isCollapsed ? 'polite' : 'off');
      childrenUl.setAttribute('aria-expanded', !isCollapsed);
      this.dataset.collapsed = !isCollapsed;

      // Updates attributes based on the new visibility state.
      if (isCollapsed) {
        setAttributesForHiddenState(childrenUl);
      } else {
        setAttributesForVisibleState(childrenUl);
      }
    }
  }

  // The functions `setAttributesForHiddenState` and `setAttributesForVisibleState` adjust the visibility state and ARIA attributes for child nodes recursively.

  function setAttributesForHiddenState(ul) {
    Array.from(ul.querySelectorAll('li')).forEach(li => {
      const childUl = li.querySelector('ul');
      if (childUl) {
        childUl.setAttribute('aria-hidden', 'true');
        li.setAttribute('aria-expanded', 'false');

        setAttributesForHiddenState(childUl); // Recursively apply
      }
    });
  }

  function setAttributesForVisibleState(ul) {
    Array.from(ul.querySelectorAll('li')).forEach(li => {
      const childUl = li.querySelector('ul');
      if (childUl) {

        childUl.setAttribute('aria-hidden', 'false');
        li.setAttribute('aria-expanded', 'true');
      }
    });
  }

  /**
   * Initializes the toggle all button and appends it to the specified parent element.
   * @param {HTMLElement} parentElement - The element to append the button to.
   */
  function initToggleAllButton(parentElement) {
    const div = document.createElement('div');
    div.setAttribute('aria-live', 'polite');
    const toggleAllButton = document.createElement('button');
    toggleAllButton.textContent = toggleAllTextOpen;
    toggleAllButton.addEventListener('click', () => {
      // Determine the current state based on the first expandable node
      const firstExpandableNode = document.querySelector('.tree .expandable');
      const isExpanded = firstExpandableNode.getAttribute('aria-expanded') === 'true';
      toggleAllNodes(!isExpanded, toggleAllButton);
    });
    div.appendChild(toggleAllButton);
    firstHeader = parentElement.querySelector(' ul > li > h2');
    firstHeader.insertAdjacentElement('afterend', div);
  }


  // Initiates tree building from the root element with the parsed JSON data.
  const treeRoot = document.getElementById('tree');
  const ul = document.createElement('ul');
  treeRoot.appendChild(ul);
  buildTree(jsonData, ul); // Start building the tree with jsonData at root level
  initToggleAllButton(treeRoot);
});
